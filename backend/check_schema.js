const dotenv = require('dotenv');
const axios = require('axios');

async function checkSchema() {
    console.log('--- DB Schema Check Script Started ---');
    dotenv.config({ path: 'd:/full system sindhuja fin/LOAN APLICATION/backend/.env' });

    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials');
        process.exit(1);
    }

    try {
        const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseKey }
        });

        const json = response.data;
        if (!json.definitions) {
            console.log("No definitions found in OpenApi spec.");
            return;
        }

        ['loans', 'members', 'staff', 'centers'].forEach(table => {
            const def = json.definitions[table];
            if (def) {
                console.log(`\nTable: ${table}`);
                console.log("Columns: " + Object.keys(def.properties).join(', '));
            } else {
                console.log(`\nTable: ${table} NOT FOUND`);
            }
        });
    } catch (e) {
        console.error('Error fetching schema:', e.message);
        if (e.response) console.error('Response data:', e.response.data);
    }
}

checkSchema();
