"use client";

import { useEffect, useMemo, useState } from "react";
import AuthModal from "../components/AuthModal";
import { supabase } from "../lib/supabase";
import {
  translations,
  categoryTranslations,
} from "./translations";

const categories = [
  { icon: "🧹", name: "Čišćenje" },
  { icon: "📦", name: "Selidbe" },
  { icon: "🌿", name: "Kuća & bašta" },
  { icon: "🔧", name: "Montaža" },
  { icon: "🚗", name: "Prevoz" },
  { icon: "🛠️", name: "Praktična pomoć" },
  { icon: "🏠", name: "Nekretnine" },
  { icon: "✨", name: "Ostalo" },
];

const demoJobs = [
  {
    id: "demo-1",
    demo: true,
    icon: "🧹",
    title: "Čišćenje stana",
    city: "Sarajevo",
    category: "Čišćenje",
    price: 80,
    description: "Potrebna pomoć oko generalnog čišćenja stana.",
    owner: "Amir K.",
    status: "open",
  },
  {
    id: "demo-2",
    demo: true,
    icon: "📦",
    title: "Pomoć pri selidbi",
    city: "Mostar",
    category: "Selidbe",
    price: 120,
    description: "Potrebna pomoć pri nošenju stvari i selidbi.",
    owner: "Lejla M.",
    status: "open",
  },
  {
    id: "demo-3",
    demo: true,
    icon: "🌿",
    title: "Sređivanje bašte",
    city: "Tuzla",
    category: "Kuća & bašta",
    price: 100,
    description: "Košenje trave i osnovno sređivanje bašte.",
    owner: "Haris S.",
    status: "open",
  },
  {
    id: "demo-4",
    demo: true,
    icon: "🔧",
    title: "Montaža ormara",
    city: "Banja Luka",
    category: "Montaža",
    price: 90,
    description: "Potrebna montaža novog ormara.",
    owner: "Jasmina D.",
    status: "open",
  },
];

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "SR";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getCategoryIcon(category) {
  return (
    categories.find((item) => item.name === category)?.icon || "✨"
  );
}

function formatPrice(price) {
  const number = Number(price);

  if (!Number.isFinite(number)) return "Po dogovoru";

  return `${number.toLocaleString("bs-BA")} KM`;
}

function normalizeStatus(status) {
  if (!status) return "open";

  const value = String(status).toLowerCase();

  if (["assigned", "accepted"].includes(value)) return "assigned";

  if (["in_progress", "progress", "active"].includes(value)) {
    return "in_progress";
  }

  if (["completed", "done"].includes(value)) return "completed";

  if (["cancelled", "canceled"].includes(value)) {
    return "cancelled";
  }

  return "open";
}

export default function Home() {
  const [language, setLanguage] = useState("bs");

  const t = translations[language] || translations.bs;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [view, setView] = useState("home");

  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [applicationsByJob, setApplicationsByJob] = useState({});
  const [myReviews, setMyReviews] = useState([]);

  const [selectedJob, setSelectedJob] = useState(null);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const [postOpen, setPostOpen] = useState(false);

  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    category: "Čišćenje",
    city: "",
    price: "",
  });

  const [applicationForm, setApplicationForm] = useState({
    message: "",
    offeredPrice: "",
  });

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    city: "",
    phone: "",
    bio: "",
    is_helper: false,
    can_post_jobs: true,
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });

  useEffect(() => {
    let mounted = true;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user || null);

      if (session?.user) {
        await loadProfile(session.user);
      }

      await loadJobs();

      if (mounted) {
        setLoading(false);
      }
    }

    start();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user || null;

      setUser(nextUser);

      if (nextUser) {
        setTimeout(async () => {
          await loadProfile(nextUser);
          await loadJobs();
        }, 0);
      } else {
        setProfile(null);
        setMyApplications([]);
        setApplicationsByJob({});
        setMyReviews([]);
        setView("home");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    loadMyApplications();
    loadMyReviews();

    if (jobs.length) {
      loadApplicationsForOwnedJobs();
    }
  }, [user, jobs]);

  async function loadProfile(currentUser = user) {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile error:", error);
      return;
    }

    if (!data) {
      const metadata = currentUser.user_metadata || {};

      const fallback = {
        id: currentUser.id,
        full_name:
          metadata.full_name ||
          currentUser.email?.split("@")[0] ||
          "Sredi korisnik",
        is_helper: metadata.role === "helper",
        can_post_jobs: true,
        language: "bs",
      };

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .upsert(fallback)
        .select()
        .single();

      if (createError) {
        console.error("Profile create error:", createError);
        return;
      }

      applyProfile(created);
      return;
    }

    applyProfile(data);
  }

  function applyProfile(data) {
    setProfile(data);

    const savedLanguage =
      data?.language === "en" ? "en" : "bs";

    setLanguage(savedLanguage);

    setProfileForm({
      full_name: data?.full_name || "",
      city: data?.city || "",
      phone: data?.phone || "",
      bio: data?.bio || "",
      is_helper: Boolean(data?.is_helper),
      can_post_jobs:
        data?.can_post_jobs === null ||
        data?.can_post_jobs === undefined
          ? true
          : Boolean(data.can_post_jobs),
    });
  }

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Jobs error:", error);
      setNotice(error.message);
      return;
    }

    setJobs(data || []);
  }

  async function loadMyApplications() {
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("helper_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Applications error:", error);
      return;
    }

    setMyApplications(data || []);
  }

  async function loadMyReviews() {
    if (!user) return;

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Reviews error:", error);
      return;
    }

    setMyReviews(data || []);
  }

  async function loadApplicationsForOwnedJobs() {
    if (!user) return;

    const ownedIds = jobs
      .filter((job) => job.owner_id === user.id)
      .map((job) => job.id);

    if (!ownedIds.length) {
      setApplicationsByJob({});
      return;
    }

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .in("job_id", ownedIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Owned applications error:", error);
      return;
    }

    const grouped = {};

    for (const application of data || []) {
      if (!grouped[application.job_id]) {
        grouped[application.job_id] = [];
      }

      grouped[application.job_id].push(application);
    }

    setApplicationsByJob(grouped);
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setProfileMenuOpen(false);
    setView("home");
    setNotice("");
  }

  function requireAuth(callback) {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    callback();
  }

  function openPostTask() {
    requireAuth(() => {
      if (profile?.can_post_jobs === false) {
        setNotice(
          language === "en"
            ? "Your profile cannot post tasks."
            : "Tvoj profil trenutno ne može objavljivati zadatke."
        );
        return;
      }

      setPostOpen(true);
    });
  }

  async function handleCreateJob(event) {
    event.preventDefault();

    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (
      !jobForm.title.trim() ||
      !jobForm.description.trim() ||
      !jobForm.city.trim()
    ) {
      setNotice(
        language === "en"
          ? "Please complete all required fields."
          : "Popuni sva obavezna polja."
      );
      return;
    }

    setActionLoading(true);
    setNotice("");

    const payload = {
      owner_id: user.id,
      title: jobForm.title.trim(),
      description: jobForm.description.trim(),
      category: jobForm.category,
      city: jobForm.city.trim(),
      price:
        jobForm.price === ""
          ? null
          : Number(jobForm.price),
      status: "open",
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert(payload)
      .select()
      .single();

    setActionLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setJobs((current) => [data, ...current]);

    setJobForm({
      title: "",
      description: "",
      category: "Čišćenje",
      city: "",
      price: "",
    });

    setPostOpen(false);
    setView("myTasks");

    setNotice(
      language === "en"
        ? "Your task has been posted."
        : "Tvoj zadatak je objavljen."
    );
  }

  async function handleApply(event) {
    event.preventDefault();

    if (!user || !selectedJob || selectedJob.demo) return;

    if (selectedJob.owner_id === user.id) {
      setNotice(
        language === "en"
          ? "You cannot apply to your own task."
          : "Ne možeš se prijaviti na vlastiti zadatak."
      );
      return;
    }

    const existing = myApplications.find(
      (item) => item.job_id === selectedJob.id
    );

    if (existing) {
      setNotice(
        language === "en"
          ? "You already applied to this task."
          : "Već si se prijavio na ovaj zadatak."
      );
      return;
    }

    setActionLoading(true);
    setNotice("");

    const { data, error } = await supabase
      .from("applications")
      .insert({
        job_id: selectedJob.id,
        helper_id: user.id,
        message: applicationForm.message.trim(),
        offered_price:
          applicationForm.offeredPrice === ""
            ? null
            : Number(applicationForm.offeredPrice),
        status: "pending",
      })
      .select()
      .single();

    setActionLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setMyApplications((current) => [data, ...current]);

    setApplicationForm({
      message: "",
      offeredPrice: "",
    });

    setSelectedJob(null);

    setNotice(
      language === "en"
        ? "Your offer has been sent."
        : "Tvoja ponuda je poslana."
    );
  }

  async function chooseHelper(job, application) {
    if (!user || job.owner_id !== user.id) return;

    setActionLoading(true);
    setNotice("");

    const { error: jobError } = await supabase
      .from("jobs")
      .update({
        selected_helper_id: application.helper_id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("owner_id", user.id);

    if (jobError) {
      setActionLoading(false);
      setNotice(jobError.message);
      return;
    }

    const { error: acceptedError } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", application.id);

    if (acceptedError) {
      setActionLoading(false);
      setNotice(acceptedError.message);
      return;
    }

    await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("job_id", job.id)
      .neq("id", application.id);

    await loadJobs();
    await loadMyApplications();
    await loadApplicationsForOwnedJobs();

    setActionLoading(false);

    setNotice(
      language === "en"
        ? "Helper selected."
        : "Pomagač je izabran."
    );
  }

  async function updateJobStatus(job, status) {
    if (!user) return;

    const allowed =
      job.owner_id === user.id ||
      job.selected_helper_id === user.id;

    if (!allowed) return;

    setActionLoading(true);
    setNotice("");

    const update = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      update.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("jobs")
      .update(update)
      .eq("id", job.id);

    setActionLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    await loadJobs();

    setNotice(
      status === "completed"
        ? language === "en"
          ? "Job marked as completed."
          : "Posao je označen kao završen."
        : language === "en"
          ? "Job started."
          : "Posao je započet."
    );
  }

  async function submitReview(job) {
    if (
      !user ||
      !job.selected_helper_id ||
      job.owner_id !== user.id
    ) {
      return;
    }

    if (
      myReviews.some(
        (review) => review.job_id === job.id
      )
    ) {
      setNotice(
        language === "en"
          ? "You have already reviewed this job."
          : "Već si ocijenio ovaj posao."
      );
      return;
    }

    setActionLoading(true);
    setNotice("");

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        job_id: job.id,
        reviewer_id: user.id,
        helper_id: job.selected_helper_id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment.trim(),
      })
      .select()
      .single();

    setActionLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setMyReviews((current) => [
      data,
      ...current,
    ]);

    setReviewForm({
      rating: 5,
      comment: "",
    });

    setNotice(
      language === "en"
        ? "Thank you for your review."
        : "Hvala na ocjeni."
    );
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!user) return;

    setActionLoading(true);
    setNotice("");

    const update = {
      full_name: profileForm.full_name.trim(),
      city: profileForm.city.trim() || null,
      phone: profileForm.phone.trim() || null,
      bio: profileForm.bio.trim() || null,
      is_helper: Boolean(profileForm.is_helper),
      can_post_jobs: Boolean(profileForm.can_post_jobs),
      language,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select()
      .single();

    setActionLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    applyProfile(data);

    setNotice(
      language === "en"
        ? "Profile saved."
        : "Profil je sačuvan."
    );
  }

  async function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);

    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        language: nextLanguage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  const visibleJobs = useMemo(() => {
    const databaseJobs = jobs.map((job) => ({
      ...job,
      icon: getCategoryIcon(job.category),
      status: normalizeStatus(job.status),
    }));

    return [...databaseJobs, ...demoJobs].filter((job) => {
      if (
        !job.demo &&
        normalizeStatus(job.status) !== "open"
      ) {
        return false;
      }

      const text = `${job.title || ""} ${job.description || ""} ${
        job.city || ""
      } ${job.category || ""}`.toLowerCase();

      const matchesSearch =
        !search.trim() ||
        text.includes(search.trim().toLowerCase());

      const matchesCity =
        cityFilter === "all" || job.city === cityFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        job.category === categoryFilter;

      return matchesSearch && matchesCity && matchesCategory;
    });
  }, [jobs, search, cityFilter, categoryFilter]);

  const myTasks = useMemo(() => {
    if (!user) return [];

    return jobs.filter((job) => job.owner_id === user.id);
  }, [jobs, user]);

  const helperJobs = useMemo(() => {
    if (!user) return [];

    const applicationJobIds = new Set(
      myApplications.map((application) => application.job_id)
    );

    return jobs.filter(
      (job) =>
        job.selected_helper_id === user.id ||
        applicationJobIds.has(job.id)
    );
  }, [jobs, myApplications, user]);

  const cities = useMemo(() => {
    const values = [
      ...jobs.map((job) => job.city),
      ...demoJobs.map((job) => job.city),
    ].filter(Boolean);

    return [...new Set(values)].sort();
  }, [jobs]);

  function statusLabel(status) {
    const normalized = normalizeStatus(status);

    if (normalized === "assigned") return t.statusAssigned;
    if (normalized === "in_progress") return t.statusProgress;
    if (normalized === "completed") return t.statusCompleted;
    if (normalized === "cancelled") return t.statusCancelled;

    return t.statusOpen;
  }

  function applicationStatusLabel(status) {
    if (status === "accepted") {
      return language === "en" ? "Accepted" : "Prihvaćeno";
    }

    if (status === "rejected") {
      return language === "en" ? "Not selected" : "Nije odabrano";
    }

    return t.pending;
  }

  function categoryLabel(category) {
    if (language === "en") {
      return categoryTranslations[category] || category;
    }

    return category;
  }

  function openJob(job) {
    setSelectedJob(job);
    setNotice("");
  }

  function navigate(nextView) {
    setView(nextView);
    setProfileMenuOpen(false);
    setNotice("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <main className="v2-shell">
        <div className="loading-screen">
          <strong>SREDI.ba</strong>
          <span>{t.loading}</span>
        </div>
      </main>
    );
  }
    return (
    <main className="v2-shell">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f8faf7;
          color: #10231b;
          font-family: Arial, Helvetica, sans-serif;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .v2-shell {
          min-height: 100vh;
          background: #f8faf7;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(248, 250, 247, 0.96);
          border-bottom: 1px solid #dfe6e1;
          backdrop-filter: blur(14px);
        }

        .nav {
          max-width: 1180px;
          min-height: 82px;
          margin: 0 auto;
          padding: 14px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .brand {
          border: 0;
          background: transparent;
          padding: 0;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -1.8px;
          color: #10231b;
        }

        .brand span {
          color: #829087;
        }

        .nav-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-link {
          border: 0;
          background: transparent;
          color: #10231b;
          font-weight: 800;
          padding: 12px 14px;
          border-radius: 12px;
        }

        .nav-link:hover {
          background: #edf2ee;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
        }

        .language-switch {
          display: flex;
          border: 1px solid #d9e1dc;
          background: white;
          border-radius: 12px;
          padding: 3px;
        }

        .language-switch button {
          border: 0;
          background: transparent;
          padding: 8px 9px;
          border-radius: 9px;
          font-weight: 800;
          color: #6c7a72;
        }

        .language-switch button.active {
          background: #e7f3eb;
          color: #10231b;
        }

        .btn {
          border: 1px solid #d9e1dc;
          border-radius: 13px;
          min-height: 46px;
          padding: 0 18px;
          font-weight: 800;
          background: white;
          color: #10231b;
        }

        .btn-dark {
          background: #10231b;
          color: white;
          border-color: #10231b;
        }

        .btn-soft {
          background: #e8f3eb;
          border-color: #e8f3eb;
        }

        .btn-danger {
          color: #94453f;
        }

        .avatar-button {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          border: 1px solid #d8e0db;
          background: white;
          display: grid;
          place-items: center;
          padding: 4px;
        }

        .avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #10231b;
          color: white;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .profile-menu {
          position: absolute;
          top: 60px;
          right: 0;
          width: 270px;
          background: white;
          border: 1px solid #dce3df;
          border-radius: 20px;
          box-shadow: 0 18px 50px rgba(15, 35, 27, 0.16);
          overflow: hidden;
        }

        .profile-menu-head {
          padding: 20px;
          border-bottom: 1px solid #e1e6e3;
        }

        .profile-menu-head strong {
          display: block;
          font-size: 20px;
          margin-bottom: 7px;
        }

        .profile-menu-head span {
          color: #718078;
        }

        .profile-menu button {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #edf0ee;
          background: white;
          text-align: left;
          padding: 17px 20px;
          font-weight: 800;
          color: #10231b;
        }

        .profile-menu button:hover {
          background: #f5f8f6;
        }

        .profile-menu button:last-child {
          border-bottom: 0;
          color: #91463e;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 22px;
        }

        .notice-global {
          max-width: 1180px;
          margin: 18px auto 0;
          padding: 14px 18px;
          border-radius: 14px;
          background: #e5f2e9;
          border: 1px solid #d2e6d8;
          color: #244333;
        }

        .hero {
          padding: 76px 0 60px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 60px;
          align-items: center;
        }

        .badge {
          display: inline-flex;
          background: #e4f1e7;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 25px;
        }

        .hero h1 {
          font-size: clamp(58px, 7vw, 94px);
          line-height: 0.92;
          letter-spacing: -5px;
          margin: 0 0 25px;
          max-width: 760px;
        }

        .hero-copy {
          max-width: 670px;
          color: #64736b;
          font-size: 20px;
          line-height: 1.55;
        }

        .hero-buttons {
          display: flex;
          gap: 12px;
          margin: 30px 0 20px;
        }

        .hero-buttons .btn {
          min-height: 54px;
          padding: 0 22px;
        }

        .search-box {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr 230px;
          border: 1px solid #dce3df;
          border-radius: 18px;
          overflow: hidden;
          background: white;
          box-shadow: 0 12px 35px rgba(20, 40, 30, 0.06);
        }

        .search-box input,
        .search-box select {
          min-height: 64px;
          border: 0;
          background: white;
          padding: 0 18px;
          outline: none;
          color: #10231b;
        }

        .search-box select {
          border-left: 1px solid #e1e6e3;
        }

        .hero-panel {
          background: #10231b;
          color: white;
          padding: 32px;
          border-radius: 28px;
          min-height: 390px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 28px 70px rgba(15, 35, 27, 0.18);
        }

        .hero-panel-small {
          color: #b7c5bd;
          font-weight: 700;
        }

        .hero-panel-number {
          font-size: 84px;
          font-weight: 900;
          letter-spacing: -5px;
        }

        .hero-panel h3 {
          font-size: 29px;
          margin: 0 0 10px;
        }

        .hero-panel p {
          color: #b7c5bd;
          line-height: 1.6;
        }

        .section {
          padding: 70px 0;
        }

        .section-white {
          background: white;
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .section-head h2 {
          margin: 0 0 8px;
          font-size: 42px;
          letter-spacing: -2px;
        }

        .section-head p {
          margin: 0;
          color: #748078;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .category-card {
          border: 1px solid #e0e6e2;
          background: white;
          border-radius: 18px;
          padding: 22px;
          text-align: left;
          min-height: 125px;
          transition: 0.2s ease;
        }

        .category-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 35px rgba(20, 40, 30, 0.08);
        }

        .category-card.active {
          border-color: #10231b;
          background: #f0f5f1;
        }

        .category-icon {
          font-size: 26px;
          display: block;
          margin-bottom: 16px;
        }

        .category-name {
          font-weight: 900;
          font-size: 17px;
        }

        .jobs-toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 22px;
        }

        .jobs-toolbar input,
        .jobs-toolbar select {
          min-height: 52px;
          border: 1px solid #dce3df;
          background: white;
          border-radius: 13px;
          padding: 0 15px;
          outline: none;
        }

        .jobs-toolbar input {
          flex: 1;
        }

        .job-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .job-card {
          background: white;
          border: 1px solid #dfe5e1;
          border-radius: 20px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          min-height: 270px;
        }

        .job-card-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: start;
        }

        .job-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #edf4ef;
          font-size: 22px;
        }

        .price {
          font-weight: 900;
          font-size: 19px;
        }

        .job-card h3 {
          font-size: 21px;
          margin: 20px 0 7px;
        }

        .job-meta {
          color: #6e7c74;
          font-size: 14px;
          margin-bottom: 13px;
        }

        .job-description {
          color: #65736b;
          line-height: 1.5;
          flex: 1;
        }

        .job-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
        }

        .status {
          display: inline-flex;
          border-radius: 999px;
          background: #e8f3eb;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .demo-badge {
          background: #f3eee2;
        }

        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .how-card {
          padding: 28px;
          border: 1px solid #e0e6e2;
          border-radius: 20px;
          background: #f9fbf9;
        }

        .step-number {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #10231b;
          color: white;
          font-weight: 900;
          margin-bottom: 35px;
        }

        .how-card h3 {
          font-size: 23px;
          margin: 0 0 10px;
        }

        .how-card p {
          color: #6b7971;
          line-height: 1.6;
        }

        .dashboard {
          padding: 45px 0 80px;
        }

        .dashboard-head {
          margin-bottom: 28px;
        }

        .dashboard-head h1 {
          font-size: 48px;
          margin: 0 0 8px;
          letter-spacing: -2px;
        }

        .dashboard-head p {
          color: #718078;
          margin: 0;
        }

        .dashboard-grid {
          display: grid;
          gap: 16px;
        }

        .crm-card {
          background: white;
          border: 1px solid #dfe5e1;
          border-radius: 20px;
          padding: 22px;
        }

        .crm-card-head {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: start;
        }

        .crm-card h3 {
          margin: 0 0 7px;
          font-size: 22px;
        }

        .crm-card p {
          color: #6c7972;
        }

        .crm-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 13px;
        }

        .crm-pill {
          background: #f0f4f1;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 13px;
          font-weight: 800;
        }

        .applications {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #e7ebe8;
        }

        .applications h4 {
          margin: 0 0 12px;
        }

        .application {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 14px 0;
          border-bottom: 1px solid #edf0ee;
        }

        .application:last-child {
          border-bottom: 0;
        }

        .application p {
          margin: 6px 0 0;
        }

        .profile-form {
          max-width: 720px;
          display: grid;
          gap: 17px;
          background: white;
          border: 1px solid #dfe5e1;
          border-radius: 22px;
          padding: 28px;
        }

        .field {
          display: grid;
          gap: 8px;
          font-weight: 800;
        }

        .field input,
        .field textarea,
        .field select {
          width: 100%;
          border: 1px solid #d7dfda;
          border-radius: 13px;
          padding: 14px;
          outline: none;
          background: white;
        }

        .field textarea {
          min-height: 120px;
          resize: vertical;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
        }

        .empty {
          padding: 45px 25px;
          border: 1px dashed #cfd9d3;
          border-radius: 18px;
          text-align: center;
          color: #6d7a73;
          background: white;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(11, 26, 19, 0.65);
          padding: 24px;
          display: grid;
          place-items: center;
          overflow-y: auto;
        }

        .v2-modal {
          width: min(620px, 100%);
          background: #fdfefd;
          border-radius: 24px;
          padding: 26px;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.28);
        }

        .modal-large {
          width: min(760px, 100%);
        }

        .modal-head-v2 {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: start;
          margin-bottom: 22px;
        }

        .modal-head-v2 h2 {
          margin: 0 0 7px;
          font-size: 29px;
        }

        .modal-head-v2 p {
          color: #718078;
          margin: 0;
        }

        .modal-close {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 0;
          background: #edf2ee;
          font-size: 24px;
        }

        .modal-form {
          display: grid;
          gap: 15px;
        }

        .two-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .detail-price {
          font-size: 27px;
          font-weight: 900;
          margin: 20px 0;
        }

        .detail-description {
          line-height: 1.65;
          color: #5f6f66;
          white-space: pre-wrap;
        }

        .review-box {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #e5eae7;
        }

        .footer {
          padding: 40px 0;
          border-top: 1px solid #dfe5e1;
        }

        .footer-inner {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          color: #718078;
        }

        .loading-screen {
          min-height: 100vh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
        }

        .loading-screen strong {
          font-size: 38px;
        }

        @media (max-width: 900px) {
          .nav-center {
            display: none;
          }

          .hero-grid {
            grid-template-columns: 1fr;
          }

          .hero-panel {
            min-height: 280px;
          }

          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .job-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .how-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .nav {
            padding: 12px 16px;
          }

          .brand {
            font-size: 27px;
          }

          .language-switch {
            display: none;
          }

          .nav-actions > .btn-dark {
            padding: 0 13px;
          }

          .hero {
            padding: 48px 0;
          }

          .hero h1 {
            font-size: 62px;
            letter-spacing: -4px;
          }

          .hero-copy {
            font-size: 18px;
          }

          .hero-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .search-box {
            grid-template-columns: 1fr;
          }

          .search-box select {
            border-left: 0;
            border-top: 1px solid #e1e6e3;
          }

          .category-grid,
          .job-grid {
            grid-template-columns: 1fr;
          }

          .jobs-toolbar {
            display: grid;
          }

          .section {
            padding: 50px 0;
          }

          .section-head h2 {
            font-size: 34px;
          }

          .two-fields {
            grid-template-columns: 1fr;
          }

          .application {
            display: grid;
          }

          .dashboard-head h1 {
            font-size: 39px;
          }

          .profile-menu {
            position: fixed;
            top: 78px;
            left: 16px;
            right: 16px;
            width: auto;
          }
        }
      `}</style>

      <header className="topbar">
        <nav className="nav">
          <button
            className="brand"
            onClick={() => navigate("home")}
          >
            SREDI<span>.ba</span>
          </button>

          <div className="nav-center">
            <button
              className="nav-link"
              onClick={() => navigate("home")}
            >
              {t.home}
            </button>

            <button
              className="nav-link"
              onClick={() => navigate("jobs")}
            >
              {t.jobs}
            </button>

            <button
              className="nav-link"
              onClick={() =>
                document
                  .getElementById("how")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              {language === "en" ? "How it works" : "Kako radi?"}
            </button>
          </div>

          <div className="nav-actions">
            <div className="language-switch">
              <button
                className={language === "bs" ? "active" : ""}
                onClick={() => changeLanguage("bs")}
              >
                BA
              </button>

              <button
                className={language === "en" ? "active" : ""}
                onClick={() => changeLanguage("en")}
              >
                EN
              </button>
            </div>

            {!user ? (
              <button
                className="btn"
                onClick={() => setAuthOpen(true)}
              >
                {t.login}
              </button>
            ) : (
              <button
                className="avatar-button"
                onClick={() =>
                  setProfileMenuOpen((current) => !current)
                }
              >
                <span className="avatar-circle">
                  {getInitials(profile?.full_name)}
                </span>
              </button>
            )}

            <button
              className="btn btn-dark"
              onClick={openPostTask}
            >
              {t.postTask}
            </button>

            {user && profileMenuOpen && (
              <div className="profile-menu">
                <div className="profile-menu-head">
                  <strong>
                    {profile?.full_name ||
                      user.email?.split("@")[0]}
                  </strong>

                  <span>
                    {profile?.is_helper
                      ? t.helper
                      : t.customer}
                  </span>
                </div>

                <button onClick={() => navigate("profile")}>
                  👤 {t.profile}
                </button>

                <button onClick={() => navigate("myTasks")}>
                  📋 {t.myTasks}
                </button>

                <button onClick={() => navigate("myJobs")}>
                  💼 {t.myJobs}
                </button>

                <button onClick={handleLogout}>
                  ↪ {t.logout}
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {notice && (
        <div className="notice-global">{notice}</div>
      )}

      {view === "home" && (
        <>
          <section className="hero">
            <div className="container hero-grid">
              <div>
                <div className="badge">
                  🇧🇦 {t.heroBadge}
                </div>

                <h1>
                  {t.heroTitle1}
                  <br />
                  {t.heroTitle2}
                </h1>

                <p className="hero-copy">{t.heroText}</p>

                <div className="hero-buttons">
                  <button
                    className="btn btn-dark"
                    onClick={openPostTask}
                  >
                    {t.needHelp}
                  </button>

                  <button
                    className="btn"
                    onClick={() => navigate("jobs")}
                  >
                    {t.earn}
                  </button>
                </div>

                <div className="search-box">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    onFocus={() => setView("jobs")}
                    placeholder={t.searchHelp}
                  />

                  <select
                    value={cityFilter}
                    onChange={(event) =>
                      setCityFilter(event.target.value)
                    }
                  >
                    <option value="all">{t.allBiH}</option>

                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hero-panel">
                <div>
                  <div className="hero-panel-small">
                    {language === "en"
                      ? "Available right now"
                      : "Dostupno trenutno"}
                  </div>

                  <div className="hero-panel-number">
                    {visibleJobs.length}
                  </div>

                  <h3>{t.availableTasks}</h3>
                </div>

                <p>
                  {language === "en"
                    ? "Find a task near you, send an offer and agree directly with the customer."
                    : "Pronađi zadatak u svojoj blizini, pošalji ponudu i dogovori posao sa naručiocem."}
                </p>

                <button
                  className="btn btn-soft"
                  onClick={() => navigate("jobs")}
                >
                  {t.jobs} →
                </button>
              </div>
            </div>
          </section>

          <section className="section section-white">
            <div className="container">
              <div className="section-head">
                <div>
                  <h2>{t.categoriesTitle}</h2>
                  <p>{t.categoriesText}</p>
                </div>
              </div>

              <div className="category-grid">
                {categories.map((category) => (
                  <button
                    className="category-card"
                    key={category.name}
                    onClick={() => {
                      setCategoryFilter(category.name);
                      navigate("jobs");
                    }}
                  >
                    <span className="category-icon">
                      {category.icon}
                    </span>

                    <span className="category-name">
                      {categoryLabel(category.name)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="section-head">
                <div>
                  <h2>{t.currentJobs}</h2>
                  <p>
                    {visibleJobs.length} {t.availableTasks}
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={() => navigate("jobs")}
                >
                  {language === "en"
                    ? "View all"
                    : "Pogledaj sve"}
                </button>
              </div>

              <div className="job-grid">
                {visibleJobs.slice(0, 6).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    t={t}
                    language={language}
                    categoryLabel={categoryLabel}
                    statusLabel={statusLabel}
                    onOpen={() => openJob(job)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="section section-white"
            id="how"
          >
            <div className="container">
              <div className="section-head">
                <div>
                  <h2>{t.howTitle}</h2>
                  <p>{t.howText}</p>
                </div>
              </div>

              <div className="how-grid">
                <HowCard
                  number="1"
                  title={t.step1Title}
                  text={t.step1Text}
                />

                <HowCard
                  number="2"
                  title={t.step2Title}
                  text={t.step2Text}
                />

                <HowCard
                  number="3"
                  title={t.step3Title}
                  text={t.step3Text}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {view === "jobs" && (
        <section className="dashboard">
          <div className="container">
            <div className="dashboard-head">
              <h1>{t.currentJobs}</h1>

              <p>
                {language === "en"
                  ? "Find work and send your offer."
                  : "Pronađi posao i pošalji svoju ponudu."}
              </p>
            </div>

            <div className="jobs-toolbar">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={t.searchJobs}
              />

              <select
                value={cityFilter}
                onChange={(event) =>
                  setCityFilter(event.target.value)
                }
              >
                <option value="all">{t.allBiH}</option>

                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="all">
                  {language === "en"
                    ? "All categories"
                    : "Sve kategorije"}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.name}
                    value={category.name}
                  >
                    {categoryLabel(category.name)}
                  </option>
                ))}
              </select>
            </div>

            {visibleJobs.length ? (
              <div className="job-grid">
                {visibleJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    t={t}
                    language={language}
                    categoryLabel={categoryLabel}
                    statusLabel={statusLabel}
                    onOpen={() => openJob(job)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">{t.noJobs}</div>
            )}
          </div>
        </section>
      )}
      {view === "myTasks" && (
        <section className="dashboard">
          <div className="container">
            <div className="dashboard-head">
              <h1>{t.myTasks}</h1>
              <p>
                {language === "en"
                  ? "Manage the tasks you have posted."
                  : "Administriraj zadatke koje si objavio."}
              </p>
            </div>

            {!user ? (
              <div className="empty">
                <p>{t.loginRequired}</p>
                <button
                  className="btn btn-dark"
                  onClick={() => setAuthOpen(true)}
                >
                  {t.login}
                </button>
              </div>
            ) : myTasks.length ? (
              <div className="dashboard-grid">
                {myTasks.map((job) => {
                  const applications =
                    applicationsByJob[job.id] || [];

                  const review = myReviews.find(
                    (item) => item.job_id === job.id
                  );

                  return (
                    <div className="crm-card" key={job.id}>
                      <div className="crm-card-head">
                        <div>
                          <h3>{job.title}</h3>

                          <div className="crm-meta">
                            <span className="crm-pill">
                              📍 {job.city}
                            </span>

                            <span className="crm-pill">
                              {categoryLabel(job.category)}
                            </span>

                            <span className="crm-pill">
                              {statusLabel(job.status)}
                            </span>

                            <span className="crm-pill">
                              {applications.length}{" "}
                              {language === "en"
                                ? applications.length === 1
                                  ? "offer"
                                  : "offers"
                                : "prijava"}
                            </span>
                          </div>
                        </div>

                        <strong className="price">
                          {formatPrice(job.price)}
                        </strong>
                      </div>

                      <p>{job.description}</p>

                      {applications.length > 0 && (
                        <div className="applications">
                          <h4>
                            {language === "en"
                              ? "Offers"
                              : "Ponude"}
                          </h4>

                          {applications.map((application) => (
                            <div
                              className="application"
                              key={application.id}
                            >
                              <div>
                                <strong>
                                  {language === "en"
                                    ? "Helper offer"
                                    : "Ponuda pomagača"}
                                </strong>

                                <div className="crm-meta">
                                  <span className="crm-pill">
                                    {application.offered_price !==
                                    null
                                      ? formatPrice(
                                          application.offered_price
                                        )
                                      : language === "en"
                                        ? "Price by agreement"
                                        : "Cijena po dogovoru"}
                                  </span>

                                  <span className="crm-pill">
                                    {applicationStatusLabel(
                                      application.status
                                    )}
                                  </span>
                                </div>

                                {application.message && (
                                  <p>{application.message}</p>
                                )}
                              </div>

                              {normalizeStatus(job.status) ===
                                "open" &&
                                application.status ===
                                  "pending" && (
                                  <button
                                    className="btn btn-dark"
                                    disabled={actionLoading}
                                    onClick={() =>
                                      chooseHelper(
                                        job,
                                        application
                                      )
                                    }
                                  >
                                    {language === "en"
                                      ? "Choose helper"
                                      : "Izaberi pomagača"}
                                  </button>
                                )}
                            </div>
                          ))}
                        </div>
                      )}

                      {normalizeStatus(job.status) ===
                        "assigned" &&
                        job.owner_id === user.id && (
                          <div
                            className="crm-meta"
                            style={{ marginTop: 18 }}
                          >
                            <button
                              className="btn btn-dark"
                              disabled={actionLoading}
                              onClick={() =>
                                updateJobStatus(
                                  job,
                                  "in_progress"
                                )
                              }
                            >
                              {language === "en"
                                ? "Start job"
                                : "Započni posao"}
                            </button>
                          </div>
                        )}

                      {normalizeStatus(job.status) ===
                        "in_progress" &&
                        job.owner_id === user.id && (
                          <div
                            className="crm-meta"
                            style={{ marginTop: 18 }}
                          >
                            <button
                              className="btn btn-dark"
                              disabled={actionLoading}
                              onClick={() =>
                                updateJobStatus(
                                  job,
                                  "completed"
                                )
                              }
                            >
                              {language === "en"
                                ? "Mark as completed"
                                : "Označi kao završeno"}
                            </button>
                          </div>
                        )}

                      {normalizeStatus(job.status) ===
                        "completed" &&
                        job.selected_helper_id && (
                          <div className="review-box">
                            {review ? (
                              <>
                                <h4>
                                  {language === "en"
                                    ? "Review submitted"
                                    : "Ocjena poslana"}
                                </h4>

                                <div className="crm-meta">
                                  <span className="crm-pill">
                                    {"⭐".repeat(
                                      Number(review.rating || 0)
                                    )}
                                  </span>
                                </div>

                                {review.comment && (
                                  <p>{review.comment}</p>
                                )}
                              </>
                            ) : (
                              <>
                                <h4>{t.review}</h4>

                                <div className="two-fields">
                                  <label className="field">
                                    {language === "en"
                                      ? "Rating"
                                      : "Ocjena"}

                                    <select
                                      value={reviewForm.rating}
                                      onChange={(event) =>
                                        setReviewForm(
                                          (current) => ({
                                            ...current,
                                            rating:
                                              event.target.value,
                                          })
                                        )
                                      }
                                    >
                                      <option value="5">
                                        ⭐⭐⭐⭐⭐
                                      </option>
                                      <option value="4">
                                        ⭐⭐⭐⭐
                                      </option>
                                      <option value="3">
                                        ⭐⭐⭐
                                      </option>
                                      <option value="2">
                                        ⭐⭐
                                      </option>
                                      <option value="1">
                                        ⭐
                                      </option>
                                    </select>
                                  </label>

                                  <label className="field">
                                    {t.message}

                                    <input
                                      value={reviewForm.comment}
                                      onChange={(event) =>
                                        setReviewForm(
                                          (current) => ({
                                            ...current,
                                            comment:
                                              event.target.value,
                                          })
                                        )
                                      }
                                      placeholder={t.reviewText}
                                    />
                                  </label>
                                </div>

                                <button
                                  className="btn btn-dark"
                                  disabled={actionLoading}
                                  onClick={() =>
                                    submitReview(job)
                                  }
                                >
                                  {t.review}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <p>{t.noMyTasks}</p>

                <button
                  className="btn btn-dark"
                  onClick={openPostTask}
                >
                  {t.postTask}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "myJobs" && (
        <section className="dashboard">
          <div className="container">
            <div className="dashboard-head">
              <h1>{t.myJobs}</h1>

              <p>
                {language === "en"
                  ? "Your offers and jobs in one place."
                  : "Tvoje prijave i poslovi na jednom mjestu."}
              </p>
            </div>

            {!user ? (
              <div className="empty">
                <p>{t.loginRequired}</p>

                <button
                  className="btn btn-dark"
                  onClick={() => setAuthOpen(true)}
                >
                  {t.login}
                </button>
              </div>
            ) : helperJobs.length ? (
              <div className="dashboard-grid">
                {helperJobs.map((job) => {
                  const application =
                    myApplications.find(
                      (item) => item.job_id === job.id
                    );

                  return (
                    <div className="crm-card" key={job.id}>
                      <div className="crm-card-head">
                        <div>
                          <h3>{job.title}</h3>

                          <div className="crm-meta">
                            <span className="crm-pill">
                              📍 {job.city}
                            </span>

                            <span className="crm-pill">
                              {categoryLabel(job.category)}
                            </span>

                            <span className="crm-pill">
                              {statusLabel(job.status)}
                            </span>

                            {application && (
                              <span className="crm-pill">
                                {applicationStatusLabel(
                                  application.status
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        <strong className="price">
                          {formatPrice(
                            application?.offered_price ??
                              job.price
                          )}
                        </strong>
                      </div>

                      <p>{job.description}</p>

                      {application?.message && (
                        <p>
                          <strong>
                            {language === "en"
                              ? "Your message:"
                              : "Tvoja poruka:"}
                          </strong>{" "}
                          {application.message}
                        </p>
                      )}

                      {job.selected_helper_id === user.id &&
                        normalizeStatus(job.status) ===
                          "assigned" && (
                          <div className="crm-meta">
                            <span className="status">
                              {language === "en"
                                ? "You were selected"
                                : "Izabran si za posao"}
                            </span>
                          </div>
                        )}

                      {job.selected_helper_id === user.id &&
                        normalizeStatus(job.status) ===
                          "in_progress" && (
                          <div className="crm-meta">
                            <span className="status">
                              {language === "en"
                                ? "Job in progress"
                                : "Posao je u toku"}
                            </span>
                          </div>
                        )}

                      {job.selected_helper_id === user.id &&
                        normalizeStatus(job.status) ===
                          "completed" && (
                          <div className="crm-meta">
                            <span className="status">
                              {language === "en"
                                ? "Job completed"
                                : "Posao završen"}
                            </span>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <p>{t.noMyJobs}</p>

                <button
                  className="btn btn-dark"
                  onClick={() => navigate("jobs")}
                >
                  {t.jobs}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "profile" && (
        <section className="dashboard">
          <div className="container">
            <div className="dashboard-head">
              <h1>{t.profile}</h1>

              <p>
                {language === "en"
                  ? "Keep your Sredi profile simple and up to date."
                  : "Drži svoj Sredi profil jednostavnim i ažurnim."}
              </p>
            </div>

            {!user ? (
              <div className="empty">
                <p>{t.loginRequired}</p>

                <button
                  className="btn btn-dark"
                  onClick={() => setAuthOpen(true)}
                >
                  {t.login}
                </button>
              </div>
            ) : (
              <form
                className="profile-form"
                onSubmit={saveProfile}
              >
                <label className="field">
                  {language === "en"
                    ? "Full name"
                    : "Ime i prezime"}

                  <input
                    value={profileForm.full_name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <div className="two-fields">
                  <label className="field">
                    {language === "en" ? "City" : "Grad"}

                    <input
                      value={profileForm.city}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      placeholder="Sarajevo"
                    />
                  </label>

                  <label className="field">
                    {language === "en"
                      ? "Phone"
                      : "Telefon"}

                    <input
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="+387..."
                    />
                  </label>
                </div>

                <label className="field">
                  Bio

                  <textarea
                    value={profileForm.bio}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    placeholder={
                      language === "en"
                        ? "Tell people a little about yourself."
                        : "Napiši ukratko nešto o sebi."
                    }
                  />
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={profileForm.is_helper}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        is_helper: event.target.checked,
                      }))
                    }
                  />

                  {language === "en"
                    ? "I want to work as a helper"
                    : "Želim raditi kao pomagač"}
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={profileForm.can_post_jobs}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        can_post_jobs:
                          event.target.checked,
                      }))
                    }
                  />

                  {language === "en"
                    ? "I want to be able to post tasks"
                    : "Želim moći objavljivati zadatke"}
                </label>

                <div>
                  <button
                    className="btn btn-dark"
                    type="submit"
                    disabled={actionLoading}
                  >
                    {language === "en"
                      ? "Save profile"
                      : "Sačuvaj profil"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="container footer-inner">
          <strong>SREDI.ba</strong>

          <span>
            {language === "en"
              ? "Simple help. Local people."
              : "Jednostavna pomoć. Lokalni ljudi."}
          </span>
        </div>
      </footer>

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={async (authUser) => {
            setUser(authUser);
            await loadProfile(authUser);
            await loadJobs();
            setAuthOpen(false);
          }}
        />
      )}

      {postOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setPostOpen(false)}
        >
          <div
            className="v2-modal modal-large"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-head-v2">
              <div>
                <h2>{t.postTask}</h2>

                <p>
                  {language === "en"
                    ? "Describe what you need help with."
                    : "Opiši šta ti je potrebno."}
                </p>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() => setPostOpen(false)}
              >
                ×
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={handleCreateJob}
            >
              <label className="field">
                {language === "en"
                  ? "Task title"
                  : "Naziv zadatka"}

                <input
                  value={jobForm.title}
                  onChange={(event) =>
                    setJobForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={
                    language === "en"
                      ? "e.g. Clean my apartment"
                      : "npr. Čišćenje stana"
                  }
                  required
                />
              </label>

              <label className="field">
                {language === "en"
                  ? "Description"
                  : "Opis"}

                <textarea
                  value={jobForm.description}
                  onChange={(event) =>
                    setJobForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={
                    language === "en"
                      ? "Describe the task..."
                      : "Opiši zadatak..."
                  }
                  required
                />
              </label>

              <div className="two-fields">
                <label className="field">
                  {language === "en"
                    ? "Category"
                    : "Kategorija"}

                  <select
                    value={jobForm.category}
                    onChange={(event) =>
                      setJobForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option
                        key={category.name}
                        value={category.name}
                      >
                        {category.icon}{" "}
                        {categoryLabel(category.name)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  {language === "en" ? "City" : "Grad"}

                  <input
                    value={jobForm.city}
                    onChange={(event) =>
                      setJobForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Sarajevo"
                    required
                  />
                </label>
              </div>

              <label className="field">
                {language === "en"
                  ? "Budget (KM)"
                  : "Budžet (KM)"}

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={jobForm.price}
                  onChange={(event) =>
                    setJobForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="100"
                />
              </label>

              <button
                className="btn btn-dark"
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading
                  ? language === "en"
                    ? "Posting..."
                    : "Objavljujem..."
                  : t.postTask}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedJob && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="v2-modal modal-large"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-head-v2">
              <div>
                <div className="crm-meta">
                  <span className="crm-pill">
                    {selectedJob.icon ||
                      getCategoryIcon(
                        selectedJob.category
                      )}{" "}
                    {categoryLabel(
                      selectedJob.category
                    )}
                  </span>

                  <span className="crm-pill">
                    📍 {selectedJob.city}
                  </span>

                  {selectedJob.demo && (
                    <span className="crm-pill">
                      Demo
                    </span>
                  )}
                </div>

                <h2 style={{ marginTop: 15 }}>
                  {selectedJob.title}
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() => setSelectedJob(null)}
              >
                ×
              </button>
            </div>

            <div className="detail-price">
              {formatPrice(selectedJob.price)}
            </div>

            <p className="detail-description">
              {selectedJob.description}
            </p>

            {selectedJob.demo ? (
              <div className="notice-global">
                {language === "en"
                  ? "This is an example task. Create or log in to use real tasks."
                  : "Ovo je primjer zadatka. Kreiraj profil ili se prijavi za stvarne zadatke."}
              </div>
            ) : selectedJob.owner_id === user?.id ? (
              <div className="notice-global">
                {language === "en"
                  ? "This is your task. You can manage offers under My tasks."
                  : "Ovo je tvoj zadatak. Ponudama upravljaš u Moji zadaci."}
              </div>
            ) : normalizeStatus(
                selectedJob.status
              ) !== "open" ? (
              <div className="notice-global">
                {language === "en"
                  ? "This task is no longer accepting offers."
                  : "Ovaj zadatak više ne prima ponude."}
              </div>
            ) : !user ? (
              <div className="modal-form">
                <div className="notice-global">
                  {language === "en"
                    ? "Log in to send an offer."
                    : "Prijavi se kako bi poslao ponudu."}
                </div>

                <button
                  className="btn btn-dark"
                  onClick={() => {
                    setSelectedJob(null);
                    setAuthOpen(true);
                  }}
                >
                  {t.login}
                </button>
              </div>
            ) : myApplications.some(
                (application) =>
                  application.job_id ===
                  selectedJob.id
              ) ? (
              <div className="notice-global">
                {language === "en"
                  ? "You already sent an offer for this task."
                  : "Već si poslao ponudu za ovaj zadatak."}
              </div>
            ) : (
              <form
                className="modal-form"
                onSubmit={handleApply}
              >
                <h3>
                  {language === "en"
                    ? "Send an offer"
                    : "Pošalji ponudu"}
                </h3>

                <label className="field">
                  {t.message}

                  <textarea
                    value={applicationForm.message}
                    onChange={(event) =>
                      setApplicationForm(
                        (current) => ({
                          ...current,
                          message:
                            event.target.value,
                        })
                      )
                    }
                    placeholder={
                      language === "en"
                        ? "Tell the customer why you can help."
                        : "Napiši naručiocu kako možeš pomoći."
                    }
                  />
                </label>

                <label className="field">
                  {language === "en"
                    ? "Your price (KM)"
                    : "Tvoja cijena (KM)"}

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      applicationForm.offeredPrice
                    }
                    onChange={(event) =>
                      setApplicationForm(
                        (current) => ({
                          ...current,
                          offeredPrice:
                            event.target.value,
                        })
                      )
                    }
                    placeholder={
                      selectedJob.price || "100"
                    }
                  />
                </label>

                <button
                  className="btn btn-dark"
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? language === "en"
                      ? "Sending..."
                      : "Šaljem..."
                    : language === "en"
                      ? "Send offer"
                      : "Pošalji ponudu"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function JobCard({
  job,
  t,
  language,
  categoryLabel,
  statusLabel,
  onOpen,
}) {
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className="job-icon">
          {job.icon || getCategoryIcon(job.category)}
        </div>

        <div className="price">
          {formatPrice(job.price)}
        </div>
      </div>

      <h3>{job.title}</h3>

      <div className="job-meta">
        📍 {job.city} · {categoryLabel(job.category)}
      </div>

      <div className="job-description">
        {job.description}
      </div>

      <div className="job-card-bottom">
        <span
          className={`status ${
            job.demo ? "demo-badge" : ""
          }`}
        >
          {job.demo
            ? "Demo"
            : statusLabel(job.status)}
        </span>

        <button className="btn" onClick={onOpen}>
          {language === "en"
            ? "View task"
            : "Pogledaj zadatak"}
        </button>
      </div>
    </article>
  );
}

function HowCard({ number, title, text }) {
  return (
    <div className="how-card">
      <div className="step-number">{number}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
