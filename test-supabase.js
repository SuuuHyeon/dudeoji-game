import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testing connection to:', supabaseUrl)
  const { data, error } = await supabase.from('leaderboard').select('*').limit(1)
  if (error) {
    console.error('Supabase Error:', error)
  } else {
    console.log('Success! Data:', data)
  }
}

test()
