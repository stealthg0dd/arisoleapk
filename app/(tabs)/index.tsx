/**
 * Main Landing Page - Dashboard with Analysis + Aribot Cards
 * 
 * =====================================================
 * ARISOLE STRIDEIQ - HOME TAB
 * =====================================================
 * 
 * This is the entry point for the app's home tab.
 * Displays the MainDashboard with:
 * - User greeting header
 * - Analysis summary card → navigates to /recording
 * - Aribot chat card → navigates to /(tabs)/chat
 * - Quick tips section
 * 
 * Navigation Flow:
 * - Dashboard → Analysis Card → /recording (video capture)
 * - Dashboard → Aribot Card → /(tabs)/chat (full chat)
 * 
 * All AI analysis (Claude), Supabase upload, and OAuth remain unchanged.
 * 
 * @author Arisole StrideIQ Team
 * @version 4.0.0
 */

import React from 'react';
import MainDashboard from '../../components/MainDashboard';

export default function Dashboard() {
  return <MainDashboard />;
}
