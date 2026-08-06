const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
    const tableNames = ['collection_schedules', 'collections', 'collection_schedule', 'repayments', 'schedules'];
    for (const table of tableNames) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (!error) {
                console.log(`✅ Table "${table}" exists! Data sample:`, data);
            } else {
                console.log(`❌ Table "${table}" error:`, error.message);
            }
        } catch (e) {
            console.log(`❌ Table "${table}" exception:`, e.message);
        }
    }
}

checkTables();
