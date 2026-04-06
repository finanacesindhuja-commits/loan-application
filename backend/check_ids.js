const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: 'd:/full system sindhuja fin/LOAN APLICATION/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: loans, error } = await supabase.from('loans').select('id').limit(5);
    fs.writeFileSync('d:/full system sindhuja fin/LOAN APLICATION/tmp/loan_ids.json', JSON.stringify({ loans, error }, null, 2));
}

check();
