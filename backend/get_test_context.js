const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: 'd:/full system sindhuja fin/LOAN APLICATION/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Starting script...');
    const { data: staff, error: staffError } = await supabase.from('staff').select('staff_id, password').eq('role', 'Relationship Officer').limit(1);
    const { data: member, error: memberError } = await supabase.from('members').select('id, name, center_id').limit(1);
    
    const output = {
        staff: staff ? staff[0] : null,
        member: member ? member[0] : null,
        errors: { staffError, memberError }
    };
    
    fs.writeFileSync('d:/full system sindhuja fin/LOAN APLICATION/tmp/test_context.json', JSON.stringify(output, null, 2));
    console.log('Done.');
}

check();
