// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://czinoycvwsjjxuqbuxtm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aW5veWN2d3Nqanh1cWJ1eHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1OTc2NjUsImV4cCI6MjA2MTE3MzY2NX0.l5fEiiZnQbXYY3wBOk8KqVH60ImYMTjyNmWGrSEKLis";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);