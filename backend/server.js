const express = require('express');
const compression = require('compression');
const NodeCache = require('node-cache');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();

const cache = new NodeCache({ stdTTL: 15 });
const flushCache = () => cache.flushAll();
const cacheMiddleware = (duration = 15) => (req, res, next) => {
  if (req.method !== 'GET') return next();
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  if (cachedResponse) return res.json(cachedResponse);
  res.sendResponse = res.json;
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, body, duration);
    }
    res.sendResponse(body);
  };
  next();
};

app.use(compression());
const PORT = process.env.PORT || 5005;

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Startup Check
(async () => {
    console.log('--- Testing Supabase Connection ---');
    // Simpler test: check if we can reach the 'staff' table which worked before
    const { data: staff, error } = await supabase.from('staff').select('staff_id').limit(1);
    if (error) {
        console.error('❌ Supabase Connection Test Failed!');
        console.dir(error, { depth: null });
    } else {
        console.log('✅ Supabase Connection SUCCESS!');
        console.log('Successfully reached the "staff" table.');
    }
})();

// CORS - Simple allow all for initial setup, but can be restricted
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options(/.*/, cors());

app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      flushCache();
    }
  });
  next();
});


// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Multer for temporary file storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit per file
});

// --- API Endpoints ---

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/staff/login', async (req, res) => {
    try {
        const { staff_id, password } = req.body;
        console.log('DEBUG: Login attempt for:', staff_id);

        const { data: staff, error } = await supabase
            .from('staff')
            .select('*')
            .eq('staff_id', staff_id?.trim().toUpperCase())
            .eq('password', password)
            .single();

        if (error || !staff) {
            console.log('DEBUG: Login failed for:', staff_id);
            if (error) console.error('Supabase Login Error:', error);
            return res.status(401).json({ error: 'Invalid Staff ID or password' });
        }

        // ROLE CHECK: Only 'Relationship Officer' allowed
        if (staff.role !== 'Relationship Officer') {
            console.log('DEBUG: Access Denied for role:', staff.role);
            return res.status(403).json({ error: 'Access denied. You are not a Relationship Officer.' });
        }

        console.log('DEBUG: Login success for:', staff_id);
        res.json({ staff });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// Centers
app.get('/api/centers', cacheMiddleware(10), async (req, res) => {
    console.log('DEBUG: Hitting GET /api/centers');
    try {
        let { staffId } = req.query;
        let query = supabase.from('centers').select('*').order('name');
        
        if (staffId) {
            staffId = staffId.toUpperCase(); // Force consistency
            query = query.eq('staff_id', staffId);
        }
        
        const { data, error } = await query;

        if (error) {
            console.error('--- Supabase FULL Error Details ---');
            console.log(JSON.stringify(error, null, 2));
            return res.status(500).json({ error: error.message, details: error });
        }

        const centerIds = data?.map(c => c.id) || [];
        
        // Fetch all members for these centers
        const { data: members } = await supabase.from('members').select('id, center_id').in('center_id', centerIds);
        
        // Fetch all loans for these centers
        const { data: loans } = await supabase.from('loans').select('id, center_id, member_id, status').in('center_id', centerIds);
        
        const enrichedData = data?.map(center => {
            const centerMembers = (members || []).filter(m => m.center_id === center.id);
            const centerLoans = (loans || []).filter(l => l.center_id === center.id);
            
            let allApproved = false;
            let isDisbursed = false;

            if (centerMembers.length > 0 && centerMembers.length === centerLoans.length) {
                // Check if every loan is APPROVED
                allApproved = centerLoans.every(l => l.status === 'APPROVED');
            }

            if (centerLoans.length > 0) {
                // A center is considered 'disbursed' / finished if all its loans have moved past the active pipeline
                isDisbursed = centerLoans.every(l => ['DISBURSED', 'CREDITED', 'REJECTED'].includes(l.status));
            }

            return {
                ...center,
                allMembersApproved: allApproved,
                hasApprovedLoans: centerLoans.some(l => l.status === 'APPROVED'),
                isDisbursed: isDisbursed,
                memberCount: centerMembers.length,
                loanCount: centerLoans.length
            };
        });

        console.log(`DEBUG: Found ${enrichedData?.length || 0} centers for staff: ${staffId}`);
        res.json(enrichedData || []);
    } catch (err) {
        console.error('❌ GET /api/centers Critical Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/centers', async (req, res) => {
    try {
        let { name, staffId } = req.body;
        if (!staffId) {
            return res.status(400).json({ error: 'Missing staffId. Please re-login.' });
        }
        
        const { data, error } = await supabase
            .from('centers')
            .insert([{ name, staff_id: staffId.toUpperCase() }]) // Save as Uppercase
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ POST /api/centers Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Import/Finalize a center - Moves APPROVED loans to READY FOR PD
app.post('/api/centers/:centerId/import', async (req, res) => {
    const { centerId } = req.params;
    try {
        console.log(`🚀 IMPORT: Finalizing center ${centerId}. Moving APPROVED loans to READY FOR PD...`);
        
        const { data, error } = await supabase
            .from('loans')
            .update({ status: 'READY FOR PD' })
            .eq('center_id', centerId)
            .eq('status', 'APPROVED')
            .select();

        if (error) throw error;
        
        // Mark center as imported
        const { error: centerError } = await supabase
            .from('centers')
            .update({ is_imported: true })
            .eq('id', centerId);

        if (centerError) {
             console.error(`⚠️ Warning: Failed to update is_imported for center ${centerId}. Ensure 'is_imported' column exists in Supabase.`, centerError.message);
        }

        console.log(`✅ IMPORT SUCCESS: Updated ${data?.length || 0} loans for center ${centerId}.`);
        res.json({ message: `Successfully imported ${data?.length || 0} loans`, updatedCount: data?.length || 0 });
    } catch (err) {
        console.error('❌ IMPORT ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Hide Center (Cross-device persistence via pseudo-soft-delete)
app.post('/api/centers/:centerId/hide', async (req, res) => {
    const { centerId } = req.params;
    try {
        console.log(`DEBUG: Hiding center ${centerId} across all devices...`);
        const { data: center } = await supabase.from('centers').select('staff_id').eq('id', centerId).single();
        if (!center) return res.status(404).json({ error: 'Center not found' });
        
        // Prefix staff id to remove it from this staff's view without dropping records
        const hiddenId = `DELETED_${center.staff_id}`;
        const { error } = await supabase
            .from('centers')
            .update({ staff_id: hiddenId })
            .eq('id', centerId);

        if (error) throw error;
        res.json({ message: 'Center successfully hidden globally' });
    } catch (err) {
        console.error('Hide Center Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Members
// ⚠️ IMPORTANT: /api/members/lookup/:memberNo MUST come before /api/members/:centerId
// Otherwise Express will treat 'lookup' as a centerId value.
app.post('/api/members', async (req, res) => {
    try {
        const { name, centerId, memberNo } = req.body;
        const { data, error } = await supabase.from('members').insert([{ name, center_id: centerId, member_no: memberNo }]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lookup member profile and latest loan data by member_no or member_id
app.get('/api/members/lookup/:memberNo', async (req, res) => {
    try {
        const { memberNo } = req.params;
        const cleanNo = memberNo.trim().toUpperCase();
        console.log(`DEBUG: Looking up member with input: "${cleanNo}"`);

        let member = null;

        // Strategy 1: Exact match on member_no (e.g. "LN-998379")
        const { data: m1 } = await supabase
            .from('members')
            .select('*')
            .eq('member_no', cleanNo)
            .maybeSingle();
        member = m1;

        // Strategy 2: Try adding "LN-" prefix if not already present (e.g. "998379" -> "LN-998379")
        if (!member && !cleanNo.startsWith('LN-')) {
            const { data: m2 } = await supabase
                .from('members')
                .select('*')
                .eq('member_no', `LN-${cleanNo}`)
                .maybeSingle();
            member = m2;
        }

        // Strategy 3: Try stripping "LN-" prefix and matching just the number part
        if (!member && cleanNo.startsWith('LN-')) {
            const numericPart = cleanNo.replace('LN-', '');
            const { data: m3 } = await supabase
                .from('members')
                .select('*')
                .eq('member_no', numericPart)
                .maybeSingle();
            member = m3;
        }

        // Strategy 4: Fallback — search by numeric DB row id
        if (!member && !isNaN(cleanNo)) {
            const { data: m4 } = await supabase
                .from('members')
                .select('*')
                .eq('id', Number(cleanNo))
                .maybeSingle();
            member = m4;
        }

        // Strategy 5: Fallback — search by Loan App ID (e.g. APP-XXXXXX or XXXXXX)
        if (!member) {
            const { data: loanByAppId } = await supabase
                .from('loans')
                .select('member_id')
                .or(`loan_app_id.eq.${cleanNo},loan_app_id.eq.APP-${cleanNo}`)
                .maybeSingle();
            if (loanByAppId?.member_id) {
                const { data: m5 } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', loanByAppId.member_id)
                    .maybeSingle();
                member = m5;
            }
        }

        console.log(`DEBUG: Member found: ${member ? `ID=${member.id}, member_no=${member.member_no}` : 'NOT FOUND'}`);

        if (!member) {
            return res.status(404).json({ error: 'Member not found with this Member No / ID' });
        }

        // 2. Fetch all loans for this member, sorted newest first
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .eq('member_id', member.id)
            .order('created_at', { ascending: false });

        if (loansError) {
            console.error('Error fetching loans for member:', loansError);
        }

        console.log(`DEBUG: Found ${loans?.length || 0} loan(s) for member ID ${member.id}`);

        let latestLoan = loans && loans.length > 0 ? loans[0] : null;

        // 3. Auto-close loan if all collection_schedules are done
        if (latestLoan && latestLoan.status !== 'CLOSED' && latestLoan.status !== 'REJECTED') {
            const { data: schedules } = await supabase
                .from('collection_schedules')
                .select('status, amount, collected_amount')
                .eq('loan_id', latestLoan.id);

            if (schedules && schedules.length > 0) {
                const allClosedOrPaid = schedules.every(s => {
                    const statusUpper = (s.status || '').toUpperCase();
                    const isClosedStatus = ['CLOSED', 'PAID', 'RECEIVED', 'FINISHED', 'COMPLETED'].includes(statusUpper);
                    const isFullyCollected = s.amount && s.collected_amount && Number(s.collected_amount) >= Number(s.amount);
                    return isClosedStatus || isFullyCollected;
                });

                if (allClosedOrPaid) {
                    console.log(`DEBUG: All collection_schedules done for loan ID ${latestLoan.id}. Auto-closing.`);
                    await supabase.from('loans').update({ status: 'CLOSED' }).eq('id', latestLoan.id);
                    latestLoan.status = 'CLOSED';
                }
            }
        }

        console.log(`DEBUG: Latest loan status: ${latestLoan?.status || 'NO LOAN'}`);

        res.json({ member, latestLoan });
    } catch (err) {
        console.error('❌ Error looking up member:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all members for a center (must be after /lookup route)
app.get('/api/members/:centerId', async (req, res) => {
    try {
        const { centerId } = req.params;
        const { data, error } = await supabase.from('members').select('*').eq('center_id', centerId).order('name');
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Re-assign member to a new center if migrated
app.post('/api/members/reassign-center', async (req, res) => {
    try {
        const { memberId, centerId } = req.body;
        if (!memberId || !centerId) {
            return res.status(400).json({ error: 'Missing memberId or centerId' });
        }

        const { data, error } = await supabase
            .from('members')
            .update({ center_id: centerId })
            .eq('id', memberId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error reassigning member center:', err);
        res.status(500).json({ error: err.message });
    }
});

// Loans
app.get('/api/loans', cacheMiddleware(10), async (req, res) => {
    try {
        // Order by newest first so member list always shows the LATEST loan status
        const { data, error } = await supabase
            .from('loans')
            .select('*, members(member_no)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        
        // Flatten the member_no into the loan object
        const formattedData = (data || []).map(loan => ({
            ...loan,
            member_no: loan.members?.member_no || null
        }));
        
        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET loans with 'Query' status for a specific staff member
app.get('/api/loans/query/:staffId', cacheMiddleware(10), async (req, res) => {
    try {
        const { staffId } = req.params;
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .eq('staff_id', staffId)
            .eq('status', 'QUERY')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching queried loans:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST to replace a specific document
app.post('/api/loans/replace-document', upload.single('replacementFile'), async (req, res) => {
    try {
        const { loanId, fieldName } = req.body;
        const file = req.file;

        if (!loanId || !fieldName) {
            return res.status(400).json({ error: 'Missing loanId or fieldName' });
        }
        if (!file) {
            return res.status(400).json({ error: 'No replacement file was uploaded or it exceeded the 15MB limit.' });
        }

        console.log(`DEBUG: Replacing document for loan ${loanId}, field ${fieldName}`);

        // 1. Get old URL to delete later
        const { data: loanData, error: fetchError } = await supabase
            .from('loans')
            .select(fieldName)
            .eq('id', loanId)
            .single();

        const oldUrl = loanData ? loanData[fieldName] : null;

        // 2. Upload new file
        const fileName = `replacements/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
            .from('loan-documents')
            .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(fileName);

        // 3. Delete old file if it exists
        if (oldUrl && oldUrl.includes('loan-documents/')) {
            try {
                const parts = oldUrl.split('loan-documents/');
                if (parts.length > 1) {
                    const oldPath = parts[1].split('?')[0]; // Remove query params
                    console.log(`DEBUG: Deleting old file from storage: ${oldPath}`);
                    await supabase.storage.from('loan-documents').remove([oldPath]);
                }
            } catch (delErr) {
                console.error('Warning: Failed to delete old file:', delErr.message);
            }
        }

        // Update the specific field and reset status to 'RESUBMITTED'
        const updateData = {
            [fieldName]: publicUrl,
            status: 'RESUBMITTED'
        };

        const { data, error: updateError } = await supabase
            .from('loans')
            .update(updateData)
            .eq('id', loanId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({ message: 'Document replaced successfully', loan: data });
    } catch (err) {
        console.error('Replace document error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/loans', upload.fields([
    { name: 'memberAadhaarFront' }, { name: 'memberAadhaarBack' },
    { name: 'nomineeAadhaarFront' }, { name: 'nomineeAadhaarBack' },
    { name: 'panCard' }, { name: 'formImage' }, { name: 'signature' },
    { name: 'memberPhoto' }, { name: 'passbookImage' }
]), async (req, res) => {
    console.log('DEBUG: Starting Loan Submission for:', req.body.personName);
    try {
        // 1. CHECK FOR DUPLICATE LOAN BY AADHAAR (Only block active status)
        const aadharNo = req.body.aadharNo;
        if (aadharNo) {
            const activeStatuses = ["PENDING", "APPROVED", "DISBURSED", "READY FOR PD", "QUERY", "RESUBMITTED", "CREDITED"];
            const { data: existingLoan, error: checkError } = await supabase
                .from('loans')
                .select('id, status, loan_app_id')
                .eq('aadhar_no', aadharNo)
                .in('status', activeStatuses)
                .limit(1)
                .maybeSingle();

            if (checkError) {
                console.error('❌ Aadhaar Check Error:', checkError);
            }

            if (existingLoan) {
                console.log(`DEBUG: Duplicate loan blocked for Aadhaar: ${aadharNo}. Existing ID: ${existingLoan.loan_app_id}`);
                return res.status(409).json({ 
                    error: 'DUPLICATE_LOAN', 
                    message: `This member (Aadhaar: ${aadharNo}) already has an active loan application (${existingLoan.loan_app_id}).` 
                });
            }
        }

        // 2. GENERATE UNIQUE APP ID
        const loanAppId = `APP-${Math.floor(100000 + Math.random() * 900000)}`;

        const dbLoanData = {
            member_id: req.body.memberId,
            center_id: req.body.centerId,
            member_cibil: req.body.memberCibil,
            person_name: req.body.personName,
            date_of_birth: req.body.dateofbirth,
            gender: req.body.gender,
            religion: req.body.religion,
            marital_status: req.body.maritalStatus,
            aadhar_no: req.body.aadharNo,
            member_work: req.body.memberwork,
            annual_income: req.body.annualIncome,
            nominee_name: req.body.nomineeName,
            nominee_dob: req.body.nomineeDob,
            nominee_gender: req.body.nomineeGender,
            nominee_religion: req.body.nomineeReligion,
            nominee_marital_status: req.body.nomineeMaritalStatus,
            nominee_relationship: req.body.nomineeRelationship,
            nominee_business: req.body.nomineeBusiness,
            mobile_no: req.body.mobileNo,
            nominee_mobile: req.body.nomineeMobile,
            member_email: req.body.memberEmail,
            address: req.body.address,
            pincode: req.body.pincode,
            house_type: req.body.houseType,
            staff_id: req.body.staffId,
            staff_name: req.body.staffName,
            center_name: req.body.centerName,
            member_name: req.body.memberName,
            status: "PENDING",
            first_cycle_rg_number: req.body.firstCycleRgNumber,
        };

        const fileFields = [
            'memberAadhaarFront', 'memberAadhaarBack',
            'nomineeAadhaarFront', 'nomineeAadhaarBack',
            'panCard', 'formImage', 'signature',
            'memberPhoto', 'passbookImage'
        ];

        for (const field of fileFields) {
            const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase() + "_url";
            if (req.files && req.files[field] && req.files[field][0]) {
                const file = req.files[field][0];
                console.log(`DEBUG: Uploading file for field: ${field} (${file.size} bytes)`);

                const fileName = `loans/${Date.now()}-${file.originalname}`;
                const { error: uploadError } = await supabase.storage
                    .from('loan-documents')
                    .upload(fileName, file.buffer, { contentType: file.mimetype });

                if (uploadError) {
                    console.error(`❌ Upload Error (${field}):`, uploadError);
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(fileName);
                dbLoanData[dbField] = publicUrl;
            } else if (req.body[field] && typeof req.body[field] === 'string' && req.body[field].startsWith('http')) {
                // Re-use pre-existing document URL from previous loan cycle
                console.log(`DEBUG: Re-using existing document URL for field: ${field}`);
                dbLoanData[dbField] = req.body[field];
            }
        }

        console.log('DEBUG: Inserting loan data into database...');
        const { data, error: insertError } = await supabase.from('loans').insert([dbLoanData]).select().single();
        if (insertError) {
            console.error('❌ Database Insert Error:', insertError);
            throw insertError;
        }

        console.log(`✅ Loan Submission Successful! ID: ${data.id}, AppID: ${loanAppId}`);
        res.json({ message: 'Loan submitted', loanId: data.id, loanAppId: data.loan_app_id });
    } catch (err) {
        console.error('❌ CRITICAL LOAN ERROR:', err);
        res.status(500).json({ error: err.message || 'Error submitting loan application' });
    }
});

// Global Error Handler to prevent crash
process.on('uncaughtException', (err) => {
    console.error('🌋 UNCAUGHT EXCEPTION - Server would have crashed!');
    console.error(err);
    process.exit(1);
});

app.listen(PORT, () => {
    console.log(`====================================`);
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
    console.log(`====================================`);
});

// ============================================================
// 🧹 AUTO CLEANUP — CLOSED loans + collection_schedules
//    Runs once on startup, then every 24 hours
//    Deletes: loans with status=CLOSED older than 30 days
//             + their collection_schedules
// ============================================================
const autoCleanupClosedLoans = async () => {
    try {
        console.log('🧹 CLEANUP: Checking for CLOSED loans older than 30 days...');

        // Date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString();

        // 1. Find all CLOSED loans older than 30 days
        const { data: closedLoans, error: fetchError } = await supabase
            .from('loans')
            .select('id, loan_app_id, person_name, created_at')
            .eq('status', 'CLOSED')
            .lt('created_at', cutoffDate);

        if (fetchError) {
            console.error('🧹 CLEANUP ERROR fetching closed loans:', fetchError.message);
            return;
        }

        if (!closedLoans || closedLoans.length === 0) {
            console.log('🧹 CLEANUP: No CLOSED loans older than 30 days found. Nothing to delete.');
            return;
        }

        console.log(`🧹 CLEANUP: Found ${closedLoans.length} CLOSED loan(s) to delete.`);
        const loanIds = closedLoans.map(l => l.id);

        // 2. Delete collection_schedules for these loans first (child records)
        const { error: scheduleDeleteError } = await supabase
            .from('collection_schedules')
            .delete()
            .in('loan_id', loanIds);

        if (scheduleDeleteError) {
            console.error('🧹 CLEANUP ERROR deleting collection_schedules:', scheduleDeleteError.message);
        } else {
            console.log(`🧹 CLEANUP: Deleted collection_schedules for ${loanIds.length} loan(s).`);
        }

        // 3. Delete the CLOSED loans themselves
        const { error: loanDeleteError } = await supabase
            .from('loans')
            .delete()
            .in('id', loanIds);

        if (loanDeleteError) {
            console.error('🧹 CLEANUP ERROR deleting loans:', loanDeleteError.message);
        } else {
            closedLoans.forEach(l => {
                console.log(`🧹 CLEANUP: Deleted loan ${l.loan_app_id || l.id} (${l.person_name}) — closed on ${l.created_at}`);
            });
            console.log(`✅ CLEANUP DONE: ${closedLoans.length} loan(s) and their schedules deleted.`);
        }

    } catch (err) {
        console.error('🧹 CLEANUP CRITICAL ERROR:', err.message);
    }
};

// Run cleanup once on server startup
autoCleanupClosedLoans();

// Then run every 24 hours automatically
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(autoCleanupClosedLoans, TWENTY_FOUR_HOURS);

// Heartbeat to keep the event loop alive
setInterval(() => {}, 60000);

console.log('DEBUG: Script execution reached end of server.js');
