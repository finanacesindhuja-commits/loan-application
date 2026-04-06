const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaff() {
    console.log('--- Fetching Staff IDs ---');
    const { data: staff, error } = await supabase.from('staff').select('staff_id, role');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Staff Records:', staff);
    }
}

checkStaff();
