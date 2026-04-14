const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
    console.log('--- Resetting Password for STF001 ---');
    const { data, error } = await supabase
        .from('staff')
        .update({ password: '1234' })
        .eq('staff_id', 'STF001');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('✅ Password successfully reset to "1234" for STF001');
    }
}

reset();
