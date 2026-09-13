import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import AuthPage from "@/pages/AuthPage";
import Home from "@/pages/Home";
import PlayerSearch from "@/pages/PlayerSearch";
import PlayerProfilePublic from "@/pages/PlayerProfilePublic";
import Rankings from "@/pages/Rankings";
import NewsList from "@/pages/NewsList";
import NewsArticle from "@/pages/NewsArticle";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import About from "@/pages/About";
import PlayerDashboard from "@/pages/PlayerDashboard";
import MatchRegistration from "@/pages/MatchRegistration";
import Matches from "@/pages/Matches";
import Achievements from "@/pages/Achievements";

import AdminOverview from "@/pages/admin/AdminOverview";
import AdminPlayers from "@/pages/admin/AdminPlayers";
import AdminMatches from "@/pages/admin/AdminMatches";
import AdminPoints from "@/pages/admin/AdminPoints";
import AdminRegistrationApprovals from "@/pages/admin/AdminRegistrationApprovals";
import AdminRegistrationPermissions from "@/pages/admin/AdminRegistrationPermissions";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import AdminNews from "@/pages/admin/AdminNews";
import AdminAchievements from "@/pages/admin/AdminAchievements";
import AdminStatistics from "@/pages/admin/AdminStatistics";
import AdminSettings from "@/pages/admin/AdminSettings";

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/players" element={<PlayerSearch />} />
      <Route path="/players/:id" element={<PlayerProfilePublic />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/achievements" element={<Achievements />} />
      <Route path="/news" element={<NewsList />} />
      <Route path="/news/:id" element={<NewsArticle />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="/about" element={<About />} />

      {/* Player (protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="PLAYER">
            <PlayerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches/:matchId/register"
        element={
          <ProtectedRoute role="PLAYER">
            <MatchRegistration />
          </ProtectedRoute>
        }
      />

      {/* Admin (protected) */}
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminOverview /></ProtectedRoute>} />
      <Route path="/admin/players" element={<ProtectedRoute role="ADMIN"><AdminPlayers /></ProtectedRoute>} />
      <Route path="/admin/matches" element={<ProtectedRoute role="ADMIN"><AdminMatches /></ProtectedRoute>} />
      <Route path="/admin/points" element={<ProtectedRoute role="ADMIN"><AdminPoints /></ProtectedRoute>} />
      <Route path="/admin/registrations" element={<ProtectedRoute role="ADMIN"><AdminRegistrationApprovals /></ProtectedRoute>} />
      <Route path="/admin/registration" element={<ProtectedRoute role="ADMIN"><AdminRegistrationPermissions /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute role="ADMIN"><AdminAnnouncements /></ProtectedRoute>} />
      <Route path="/admin/news" element={<ProtectedRoute role="ADMIN"><AdminNews /></ProtectedRoute>} />
      <Route path="/admin/achievements" element={<ProtectedRoute role="ADMIN"><AdminAchievements /></ProtectedRoute>} />
      <Route path="/admin/statistics" element={<ProtectedRoute role="ADMIN"><AdminStatistics /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="ADMIN"><AdminSettings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
