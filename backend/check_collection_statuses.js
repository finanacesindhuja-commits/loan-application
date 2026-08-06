const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStatuses() {
    const { data, error } = await supabase
        .from('collection_schedules')
        .select('status, loan_id, member_id, amount, collected_amount')
        .limit(50);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const statuses = [...new Set(data.map(d => d.status))];
    console.log("Distinct collection_schedules statuses:", statuses);
    console.log("Sample records:", data.slice(0, 5));
}

checkStatuses();
