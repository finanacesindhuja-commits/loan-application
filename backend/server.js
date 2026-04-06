const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// Supabase Configuration - Trimming to avoid hidden characters
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

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

// CORS - Allow frontend URL from env or fallback to localhost
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') console.log('Body:', JSON.stringify(req.body));
    next();
});

// Multer for temporary file storage
const upload = multer({ storage: multer.memoryStorage() });

// --- API Endpoints ---

// Staff Login
app.post('/staff/login', async (req, res) => {
    try {
        const { staff_id, password } = req.body;
        console.log('DEBUG: Login attempt for:', staff_id);

        const { data: staff, error } = await supabase
            .from('staff')
            .select('*')
            .eq('staff_id', staff_id?.toUpperCase())
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
app.get('/api/centers', async (req, res) => {
    console.log('DEBUG: Hitting GET /api/centers');
    try {
        const { staffId } = req.query;
        let query = supabase.from('centers').select('*').order('name');
        if (staffId) {
            query = query.eq('staff_id', staffId);
        }
        const { data, error } = await query;
        
        if (error) {
            console.error('--- Supabase FULL Error Details ---');
            console.log(JSON.stringify(error, null, 2));
            return res.status(500).json({ error: error.message, details: error });
        }
        
        console.log('DEBUG: Supabase returned data:', data ? data.length : 0, 'rows');
        res.json(data || []);
    } catch (err) {
        console.error('❌ GET /api/centers Critical Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/centers', async (req, res) => {
    try {
        const { name, staffId } = req.body;
        const { data, error } = await supabase.from('centers').insert([{ name, staff_id: staffId }]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Members
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

// Loans
app.get('/api/loans', async (req, res) => {
    try {
        const { data, error } = await supabase.from('loans').select('*');
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET loans with 'Query' status for a specific staff member
app.get('/api/loans/query/:staffId', async (req, res) => {
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

        if (!loanId || !fieldName || !file) {
            return res.status(400).json({ error: 'Missing loanId, fieldName, or file' });
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
            staff_id: req.body.staffId,
            staff_name: req.body.staffName,
            center_name: req.body.centerName,
            member_name: req.body.memberName,
            first_cycle_rg_number: req.body.firstCycleRgNumber,
        };

        const fileFields = [
            'memberAadhaarFront', 'memberAadhaarBack',
            'nomineeAadhaarFront', 'nomineeAadhaarBack',
            'panCard', 'formImage', 'signature',
            'memberPhoto', 'passbookImage'
        ];

        if (req.files) {
            for (const field of fileFields) {
                if (req.files[field] && req.files[field][0]) {
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
                    const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase() + "_url";
                    dbLoanData[dbField] = publicUrl;
                }
            }
        }

        console.log('DEBUG: Inserting loan data into database...');
        const { data, error: insertError } = await supabase.from('loans').insert([dbLoanData]).select().single();
        if (insertError) {
            console.error('❌ Database Insert Error:', insertError);
            throw insertError;
        }

        console.log('✅ Loan Submission Successful!');
        res.json({ message: 'Loan submitted', loanId: data.id });
    } catch (err) {
        console.error('❌ CRITICAL LOAN ERROR:', err);
        res.status(500).json({ error: err.message || 'Error submitting loan application' });
    }
});

// Global Error Handler to prevent crash
process.on('uncaughtException', (err) => {
    console.error('🌋 UNCAUGHT EXCEPTION - Server would have crashed!');
    console.error(err);
});

app.listen(PORT, () => {
    console.log(`====================================`);
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
    console.log(`====================================`);
});
