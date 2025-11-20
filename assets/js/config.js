// js/config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://dlyimebtdchiyxdluwrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWltZWJ0ZGNoaXl4ZGx1d3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDU2MTgsImV4cCI6MjA3ODIyMTYxOH0.YdvsEJgaKQ4H9ZMWplnyQ6Go04xM9MtrHdBx1tenCF4'; // Usa la que tienes en tu app.js actual

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);