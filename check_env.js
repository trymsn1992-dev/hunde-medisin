const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.log("ERROR: .env.local file not found at " + envPath);
    process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));

const { createClient } = require('@supabase/supabase-js');

if (envConfig.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SUCCESS: Key found!");
    console.log("Key length: " + envConfig.SUPABASE_SERVICE_ROLE_KEY.length);

    try {
        const sb = createClient(
            envConfig.NEXT_PUBLIC_SUPABASE_URL,
            envConfig.SUPABASE_SERVICE_ROLE_KEY
        );
        console.log("SUCCESS: Supabase Admin Client initialized without error.");
    } catch (e) {
        console.error("FAILURE: Could not init Supabase client: " + e.message);
    }

} else {
    console.log("FAILURE: Key NOT found in .env.local");
    console.log("Keys found: " + Object.keys(envConfig).join(", "));
}
