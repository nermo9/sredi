"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AuthModal from "../components/AuthModal";
import { supabase } from "../lib/supabase";

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
    id: 1,
    icon: "🧹",
    title: "Čišćenje stana",
    city: "Sarajevo",
    category: "Čišćenje",
    price: 80,
    description: "Potrebna pomoć oko generalnog čišćenja stana.",
    owner: "Amir K.",
  },
  {
    id: 2,
    icon: "📦",
    title: "Pomoć pri selidbi",
    city: "Banja Luka",
    category: "Selidbe",
    price: 120,
    description: "Tražim pomoć za nošenje kutija i namještaja.",
    owner: "Marko P.",
  },
  {
    id: 3,
    icon: "🌿",
    title: "Košenje trave",
    city: "Mostar",
    category: "Kuća & bašta",
    price: 60,
    description: "Potrebno pokositi travu i srediti manje dvorište.",
    owner: "Lejla H.",
  },
  {
    id: 4,
    icon: "🔧",
    title: "Montaža namještaja",
    city: "Tuzla",
    category: "Montaža",
    price: 90,
    description: "Potrebna montaža ormara i jedne komode.",
    owner: "Haris S.",
  },
  {
    id: 5,
    icon: "🚗",
    title: "Preuzimanje i dostava",
    city: "Zenica",
    category: "Prevoz",
    price: 45,
    description: "Preuzeti paket u centru i dostaviti ga na adresu.",
    owner: "Emina B.",
  },
  {
    id: 6,
    icon: "🏠",
    title: "Pomoć oko stana",
    city: "Bihać",
    category: "Praktična pomoć",
    price: 100,
    description: "Potrebna pomoć oko nekoliko manjih poslova u stanu.",
    owner: "Adnan M.",
  },
];

const demoHelpers = [
  {
    id: 1,
    name: "Amar H.",
    initials: "AH",
    city: "Sarajevo",
    rating: 4.9,
    reviewCount: 47,
    completedJobs: 63,
    bio: "Pouzdan i iskusan pomagač za montažu, selidbe i praktične poslove.",
    skills: ["Montaža", "Selidbe", "Praktična pomoć"],
  },
  {
    id: 2,
    name: "Lejla M.",
    initials: "LM",
    city: "Mostar",
    rating: 5.0,
    reviewCount: 31,
    completedJobs: 38,
    bio: "Pažljiva i odgovorna pomoć za čišćenje, dom i baštu.",
    skills: ["Čišćenje", "Kuća & bašta"],
  },
  {
    id: 3,
    name: "Adnan K.",
    initials: "AK",
    city: "Tuzla",
    rating: 4.8,
    reviewCount: 82,
    completedJobs: 104,
    bio: "Iskusan pomagač za prevoz, selidbe i montažu.",
    skills: ["Prevoz", "Selidbe", "Montaža"],
  },
];

function getUserName(user) {
  if (!user) return "";

  const metadataName = user.user_metadata?.full_name?.trim();

  if (metadataName) return metadataName;

  return user.email?.split("@")[0] || "Korisnik";
}

function getUserRole(user) {
  return user?.user_metadata?.role === "helper"
    ? "helper"
    : "customer";
}

function getInitials(name) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "S";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Home() {
  const [mode, setMode] = useState("help");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Cijela BiH");
  const [category, setCategory] = useState("Sve");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [showAuth, setShowAuth] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showMyJobs, setShowMyJobs] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedHelper, setSelectedHelper] = useState(null);

  const [notice, setNotice] = useState("");

  const menuRef = useRef(null);

  const [jobForm, setJobForm] = useState({
    title: "",
    category: "",
    city: "",
    budget: "",
    description: "",
  });

  const userName = getUserName(user);
  const userRole = getUserRole(user);
  const isHelper = userRole === "helper";

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (session?.user) {
        setShowAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function closeMenu(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const search = query.trim().toLowerCase();

    return demoJobs.filter((job) => {
      const matchesQuery =
        !search ||
        job.title.toLowerCase().includes(search) ||
        job.description.toLowerCase().includes(search) ||
        job.city.toLowerCase().includes(search) ||
        job.category.toLowerCase().includes(search);

      const matchesCity =
        city === "Cijela BiH" || job.city === city;

      const matchesCategory =
        category === "Sve" || job.category === category;

      return matchesQuery && matchesCity && matchesCategory;
    });
  }, [query, city, category]);

  function scrollTo(id) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function openAuth(message = "") {
    setNotice(message);
    setShowAuth(true);
    setShowUserMenu(false);
  }

  function openJobForm() {
    if (!user) {
      openAuth(
        "Prijavi se ili napravi profil kako bi objavio zadatak."
      );
      return;
    }

    setShowJobForm(true);
    setShowUserMenu(false);
  }

  function handleJobFormChange(event) {
    const { name, value } = event.target;

    setJobForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleJobContinue(event) {
    event.preventDefault();

    if (!user) {
      setShowJobForm(false);
      openAuth(
        "Prijavi se ili napravi profil kako bi objavio zadatak."
      );
      return;
    }

    setShowJobForm(false);
    setNotice(
      "Forma radi. U sljedećem koraku povezujemo stvarno objavljivanje zadataka sa bazom."
    );

    setJobForm({
      title: "",
      category: "",
      city: "",
      budget: "",
      description: "",
    });
  }

  function handleApply(job) {
    setSelectedJob(null);

    if (!user) {
      openAuth(
        `Prijavi se kako bi se javio za zadatak "${job.title}".`
      );
      return;
    }

    if (!isHelper) {
      setNotice(
        "Za prijavu na zadatke potreban je profil pomagača."
      );
      return;
    }

    setNotice(
      `Prijava za "${job.title}" će biti povezana sa bazom u sljedećem koraku.`
    );
  }

  async function handleLogout() {
    setShowUserMenu(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(error.message);
      return;
    }

    setUser(null);
    setShowMyProfile(false);
    setShowMyJobs(false);
    setNotice("Uspješno ste se odjavili.");
  }

  function handleAuthSuccess(authUser) {
    if (authUser) {
      setUser(authUser);
    }

    setShowAuth(false);
    setNotice("");
  }

  return (
    <main className="site">
      <style jsx global>{`
        :root {
          --green: #17231e;
          --green-2: #213029;
          --green-3: #304238;
          --cream: #f7f8f5;
          --white: #ffffff;
          --line: #dfe3de;
          --muted: #6d7771;
          --soft: #e2eee6;
          --gold: #f2b84b;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--cream);
          color: var(--green);
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

        button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .site {
          min-height: 100vh;
          overflow-x: hidden;
        }

        .container {
          width: min(1160px, calc(100% - 36px));
          margin: 0 auto;
        }

        .header {
          position: relative;
          z-index: 100;
          border-bottom: 1px solid var(--line);
          background: var(--cream);
        }

        .nav {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .logo {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -1.5px;
          white-space: nowrap;
        }

        .logo span {
          color: #728078;
          font-weight: 700;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-link {
          border: 0;
          background: transparent;
          color: var(--green);
          font-weight: 800;
          padding: 12px 10px;
        }

        .btn {
          border: 0;
          border-radius: 11px;
          padding: 13px 18px;
          font-weight: 850;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn-dark {
          background: var(--green);
          color: white;
        }

        .btn-light {
          background: white;
          color: var(--green);
          border: 1px solid var(--line);
        }

        .btn-wide {
          width: 100%;
        }

        .account-wrap {
          position: relative;
        }

        .account-button {
          min-width: 150px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 11px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: white;
          color: var(--green);
          padding: 8px 11px;
        }

        .account-avatar {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--green);
          color: white;
          font-size: 11px;
          font-weight: 900;
        }

        .account-copy {
          min-width: 0;
          flex: 1;
          text-align: left;
        }

        .account-name {
          display: block;
          max-width: 145px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 900;
        }

        .account-role {
          display: block;
          margin-top: 2px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }

        .account-arrow {
          font-size: 11px;
        }

        .account-menu {
          position: absolute;
          top: calc(100% + 9px);
          right: 0;
          width: 225px;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: white;
          box-shadow: 0 18px 45px rgba(23, 35, 30, 0.14);
        }

        .account-menu-head {
          padding: 15px;
          border-bottom: 1px solid var(--line);
        }

        .account-menu-head strong {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .account-menu-head span {
          color: var(--muted);
          font-size: 11px;
        }

        .account-menu button {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #eef0ed;
          background: white;
          color: var(--green);
          padding: 13px 15px;
          text-align: left;
          font-size: 13px;
          font-weight: 800;
        }

        .account-menu button:hover {
          background: var(--cream);
        }

        .account-menu button:last-child {
          border-bottom: 0;
        }

        .logout-button {
          color: #8b3434 !important;
        }

        .hero {
          padding: 74px 0 72px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--soft);
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 850;
        }

        .hero h1 {
          max-width: 900px;
          margin: 25px 0 24px;
          font-size: clamp(60px, 9vw, 105px);
          line-height: 0.88;
          letter-spacing: -6px;
        }

        .lead {
          max-width: 650px;
          margin: 0;
          color: #65716a;
          font-size: 19px;
          line-height: 1.6;
        }

        .mode-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 28px 0 20px;
        }

        .search-box {
          max-width: 830px;
          display: grid;
          grid-template-columns: 1fr 205px;
          overflow: hidden;
          background: white;
          border: 1px solid var(--line);
          border-radius: 14px;
          box-shadow: 0 10px 35px rgba(23, 35, 30, 0.04);
        }

        .search-box input,
        .search-box select {
          min-width: 0;
          border: 0;
          outline: 0;
          background: white;
          color: var(--green);
          padding: 18px;
        }

        .search-box select {
          border-left: 1px solid #e8ebe7;
        }

        .hero-note {
          margin-top: 15px;
          color: var(--muted);
          font-size: 13px;
        }

        .section {
          padding: 68px 0;
        }

        .section-white {
          background: white;
        }

        .section-dark {
          background: var(--green);
          color: white;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 25px;
          margin-bottom: 28px;
        }

        .section-head h2 {
          margin: 0;
          font-size: 40px;
          letter-spacing: -2px;
        }

        .section-head p {
          margin: 9px 0 0;
          color: var(--muted);
          line-height: 1.55;
        }

        .section-dark .section-head p {
          color: #b8c1bb;
        }

        .categories {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .category-card {
          min-height: 118px;
          padding: 22px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: white;
          color: var(--green);
          text-align: left;
        }

        .category-card.active {
          background: var(--green);
          border-color: var(--green);
          color: white;
        }

        .category-icon {
          display: block;
          margin-bottom: 16px;
          font-size: 27px;
        }

        .category-name {
          display: block;
          font-weight: 900;
        }

        .job-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .job-card {
          display: flex;
          flex-direction: column;
          min-height: 335px;
          padding: 22px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: white;
        }

        .job-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #eef1ec;
          font-size: 25px;
        }

        .job-card h3 {
          margin: 22px 0 9px;
          font-size: 21px;
          letter-spacing: -0.5px;
        }

        .job-description {
          flex: 1;
          color: #66716b;
          font-size: 14px;
          line-height: 1.6;
        }

        .job-meta,
        .job-owner {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .job-owner {
          margin-top: 6px;
        }

        .job-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          padding-top: 17px;
          border-top: 1px solid #eceeea;
        }

        .price {
          font-size: 22px;
          font-weight: 900;
          white-space: nowrap;
        }

        .empty {
          grid-column: 1 / -1;
          padding: 30px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: white;
          color: var(--muted);
          text-align: center;
        }

        .helper-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .helper-card {
          padding: 24px;
          border: 1px solid #34443b;
          border-radius: 18px;
          background: var(--green-2);
        }

        .helper-head {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #dce9dc;
          color: var(--green);
          font-weight: 900;
        }

        .helper-name {
          font-size: 20px;
          font-weight: 900;
        }

        .helper-city {
          margin-top: 4px;
          color: #b6c0ba;
          font-size: 13px;
        }

        .helper-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 21px 0;
          padding: 18px 0;
          border-top: 1px solid #35463c;
          border-bottom: 1px solid #35463c;
        }

        .stat strong {
          display: block;
          margin-bottom: 5px;
          font-size: 21px;
        }

        .stat span {
          color: #b6c0ba;
          font-size: 12px;
        }

        .rating {
          color: var(--gold);
        }

        .helper-bio {
          min-height: 65px;
          color: #c7cfc9;
          font-size: 14px;
          line-height: 1.6;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 18px 0;
        }

        .tag {
          padding: 7px 9px;
          border-radius: 999px;
          background: var(--green-3);
          color: white;
          font-size: 11px;
          font-weight: 800;
        }

        .helper-button {
          width: 100%;
          border: 0;
          border-radius: 10px;
          background: white;
          color: var(--green);
          padding: 13px;
          font-weight: 900;
        }

        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .how-card {
          padding: 26px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: white;
        }

        .step-number {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--green);
          color: white;
          font-weight: 900;
        }

        .how-card h3 {
          margin: 20px 0 9px;
          font-size: 20px;
        }

        .how-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.6;
        }

        .trust-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 35px;
          padding: 46px;
          border-radius: 25px;
          background: var(--soft);
        }

        .trust-box h2 {
          max-width: 620px;
          margin: 0 0 12px;
          font-size: 38px;
          letter-spacing: -2px;
        }

        .trust-box p {
          max-width: 650px;
          margin: 0;
          color: #66716b;
          line-height: 1.6;
        }

        .footer {
          padding: 38px 0 50px;
          border-top: 1px solid var(--line);
        }

        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .footer p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .modal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(12, 24, 17, 0.72);
        }

        .modal-card {
          width: min(520px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          padding: 27px;
          border-radius: 21px;
          background: var(--cream);
          color: var(--green);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25);
        }

        .modal-card-large {
          width: min(650px, 100%);
        }

        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .modal-head h2 {
          margin: 0;
          font-size: 31px;
          letter-spacing: -1.5px;
        }

        .modal-head p {
          margin: 7px 0 0;
          color: var(--muted);
        }

        .close {
          border: 0;
          background: transparent;
          color: var(--green);
          font-size: 29px;
          line-height: 1;
        }

        .form {
          display: grid;
          gap: 12px;
        }

        .form label {
          display: grid;
          gap: 7px;
          color: #455049;
          font-size: 13px;
          font-weight: 800;
        }

        .form input,
        .form select,
        .form textarea {
          width: 100%;
          border: 1px solid #dce1dc;
          border-radius: 11px;
          outline: 0;
          background: white;
          color: var(--green);
          padding: 14px;
        }

        .form textarea {
          min-height: 115px;
          resize: vertical;
        }

        .notice {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--soft);
          color: #3d4c43;
          font-size: 13px;
          line-height: 1.5;
        }

        .floating-notice {
          position: fixed;
          z-index: 1200;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          width: min(500px, calc(100% - 30px));
        }

        .job-modal-price {
          margin: 18px 0;
          font-size: 27px;
          font-weight: 900;
        }

        .profile-hero {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .profile-avatar {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #dce9dc;
          font-size: 20px;
          font-weight: 900;
        }

        .profile-role {
          display: inline-flex;
          margin-top: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          background: var(--soft);
          color: var(--green);
          font-size: 11px;
          font-weight: 900;
        }

        .profile-email {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .profile-rating {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 20px 0;
          padding: 20px;
          border-radius: 15px;
          background: var(--green);
          color: white;
        }

        .profile-rating strong {
          display: block;
          margin-bottom: 5px;
          font-size: 24px;
        }

        .profile-rating span {
          color: #c1cbc4;
          font-size: 12px;
        }

        .rating-explanation {
          padding: 14px;
          border-radius: 11px;
          background: var(--soft);
          color: #4e5b53;
          font-size: 13px;
          line-height: 1.55;
        }

        .dashboard-box {
          padding: 20px;
          border: 1px solid var(--line);
          border-radius: 15px;
          background: white;
        }

        .dashboard-box + .dashboard-box {
          margin-top: 12px;
        }

        .dashboard-box h3 {
          margin: 0 0 8px;
        }

        .dashboard-box p {
          margin: 0;
          color: var(--muted);
          line-height: 1.6;
        }

        @media (max-width: 850px) {
          .container {
            width: calc(100% - 26px);
          }

          .nav {
            min-height: 68px;
          }

          .nav-link {
            display: none;
          }

          .nav-actions {
            gap: 6px;
          }

          .nav-actions > .btn {
            padding: 11px 12px;
            font-size: 13px;
          }

          .account-button {
            min-width: 0;
            padding: 7px;
          }

          .account-copy,
          .account-arrow {
            display: none;
          }

          .account-menu {
            right: 0;
          }

          .hero {
            padding: 52px 0 55px;
          }

          .hero h1 {
            font-size: 60px;
            letter-spacing: -4px;
          }

          .lead {
            font-size: 16px;
          }

          .search-box {
            grid-template-columns: 1fr;
          }

          .search-box select {
            border-top: 1px solid #e8ebe7;
            border-left: 0;
          }

          .section {
            padding: 52px 0;
          }

          .section-head {
            align-items: start;
            flex-direction: column;
          }

          .section-head h2 {
            font-size: 33px;
          }

          .categories {
            grid-template-columns: repeat(2, 1fr);
          }

          .job-grid,
          .helper-grid,
          .how-grid {
            grid-template-columns: 1fr;
          }

          .job-card {
            min-height: 0;
          }

          .helper-bio {
            min-height: 0;
          }

          .trust-box {
            align-items: start;
            flex-direction: column;
            padding: 30px;
          }

          .trust-box h2 {
            font-size: 31px;
          }

          .footer-row {
            align-items: start;
            flex-direction: column;
          }
        }

        @media (max-width: 420px) {
          .logo {
            font-size: 23px;
          }

          .hero h1 {
            font-size: 53px;
          }

          .categories {
            gap: 9px;
          }

          .category-card {
            min-height: 105px;
            padding: 17px;
          }

          .job-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .job-footer .btn {
            width: 100%;
          }

          .profile-rating {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="header">
        <div className="container">
          <nav className="nav">
            <div className="logo">
              SREDI<span>.ba</span>
            </div>

            <div className="nav-actions">
              <button
                className="nav-link"
                onClick={() => scrollTo("jobs")}
              >
                Poslovi
              </button>

              <button
                className="nav-link"
                onClick={() => scrollTo("helpers")}
              >
                Pomagači
              </button>

              <button
                className="nav-link"
                onClick={() => scrollTo("how")}
              >
                Kako radi?
              </button>

              {!authLoading && !user && (
                <button
                  className="btn btn-light"
                  onClick={() => openAuth()}
                >
                  Prijavi se
                </button>
              )}

              {!authLoading && user && (
                <div className="account-wrap" ref={menuRef}>
                  <button
                    className="account-button"
                    onClick={() =>
                      setShowUserMenu((current) => !current)
                    }
                  >
                    <span className="account-avatar">
                      {getInitials(userName)}
                    </span>

                    <span className="account-copy">
                      <span className="account-name">
                        {userName}
                      </span>

                      <span className="account-role">
                        {isHelper ? "Pomagač" : "Tražim pomoć"}
                      </span>
                    </span>

                    <span className="account-arrow">
                      ▾
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="account-menu">
                      <div className="account-menu-head">
                        <strong>{userName}</strong>
                        <span>
                          {isHelper
                            ? "Pomagač"
                            : "Tražim pomoć"}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setShowMyProfile(true);
                          setShowUserMenu(false);
                        }}
                      >
                        👤 Moj profil
                      </button>

                      <button
                        onClick={() => {
                          setShowMyJobs(true);
                          setShowUserMenu(false);
                        }}
                      >
                        {isHelper
                          ? "🧰 Moji poslovi"
                          : "📋 Moji zadaci"}
                      </button>

                      <button
                        className="logout-button"
                        onClick={handleLogout}
                      >
                        ↪ Odjavi se
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-dark"
                onClick={openJobForm}
              >
                Objavi zadatak
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="eyebrow">
            🇧🇦 Pomoć širom Bosne i Hercegovine
          </div>

          <h1>
            Treba ti pomoć?
            <br />
            Sredi.
          </h1>

          <p className="lead">
            Objavi šta trebaš. Pronađi pouzdanog pomagača u
            svojoj blizini. Ili zaradi pomažući drugima.
          </p>

          <div className="mode-buttons">
            <button
              className={
                mode === "help"
                  ? "btn btn-dark"
                  : "btn btn-light"
              }
              onClick={() => setMode("help")}
            >
              Trebam pomoć
            </button>

            <button
              className={
                mode === "earn"
                  ? "btn btn-dark"
                  : "btn btn-light"
              }
              onClick={() => {
                setMode("earn");
                scrollTo("jobs");
              }}
            >
              Želim zaraditi
            </button>
          </div>

          <div className="search-box">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                mode === "earn"
                  ? "Pretraži dostupne poslove..."
                  : "Šta trebaš srediti?"
              }
            />

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option>Cijela BiH</option>
              <option>Sarajevo</option>
              <option>Banja Luka</option>
              <option>Mostar</option>
              <option>Tuzla</option>
              <option>Zenica</option>
              <option>Bihać</option>
            </select>
          </div>

          <div className="hero-note">
            Brzo pronađi zadatak ili pomoć u svom gradu.
          </div>
        </section>
      </div>

      <section className="section section-white">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Šta trebaš srediti?</h2>
              <p>
                Odaberi kategoriju i pronađi odgovarajuću pomoć.
              </p>
            </div>

            {category !== "Sve" && (
              <button
                className="btn btn-light"
                onClick={() => setCategory("Sve")}
              >
                Prikaži sve
              </button>
            )}
          </div>

          <div className="categories">
            {categories.map((item) => (
              <button
                key={item.name}
                className={
                  category === item.name
                    ? "category-card active"
                    : "category-card"
                }
                onClick={() =>
                  setCategory((current) =>
                    current === item.name
                      ? "Sve"
                      : item.name
                  )
                }
              >
                <span className="category-icon">
                  {item.icon}
                </span>

                <span className="category-name">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="jobs">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Aktuelni poslovi</h2>
              <p>{filteredJobs.length} dostupnih zadataka.</p>
            </div>

            <button
              className="btn btn-dark"
              onClick={openJobForm}
            >
              + Objavi zadatak
            </button>
          </div>

          <div className="job-grid">
            {filteredJobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-icon">{job.icon}</div>

                <h3>{job.title}</h3>

                <div className="job-description">
                  {job.description}
                </div>

                <div className="job-meta">
                  📍 {job.city} · {job.category}
                </div>

                <div className="job-owner">
                  Objavio: {job.owner}
                </div>

                <div className="job-footer">
                  <div className="price">{job.price} KM</div>

                  <button
                    className="btn btn-dark"
                    onClick={() => setSelectedJob(job)}
                  >
                    Zainteresovan sam
                  </button>
                </div>
              </article>
            ))}

            {filteredJobs.length === 0 && (
              <div className="empty">
                Nema zadataka koji odgovaraju tvojoj pretrazi.
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="section section-dark"
        id="helpers"
      >
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Pouzdani pomagači</h2>
              <p>
                Pogledaj ocjene i iskustvo prije nego odabereš
                pomagača.
              </p>
            </div>
          </div>

          <div className="helper-grid">
            {demoHelpers.map((helper) => (
              <article className="helper-card" key={helper.id}>
                <div className="helper-head">
                  <div className="avatar">
                    {helper.initials}
                  </div>

                  <div>
                    <div className="helper-name">
                      {helper.name}
                    </div>

                    <div className="helper-city">
                      📍 {helper.city}
                    </div>
                  </div>
                </div>

                <div className="helper-stats">
                  <div className="stat">
                    <strong className="rating">
                      ★ {helper.rating.toFixed(1)}
                    </strong>

                    <span>
                      {helper.reviewCount} ocjena
                    </span>
                  </div>

                  <div className="stat">
                    <strong>{helper.completedJobs}</strong>
                    <span>završenih poslova</span>
                  </div>
                </div>

                <p className="helper-bio">
                  {helper.bio}
                </p>

                <div className="tags">
                  {helper.skills.map((skill) => (
                    <span className="tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>

                <button
                  className="helper-button"
                  onClick={() => setSelectedHelper(helper)}
                >
                  Pogledaj profil
                </button>
              </article>
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
              <h2>Kako radi Sredi?</h2>
              <p>Od objave zadatka do završene pomoći.</p>
            </div>
          </div>

          <div className="how-grid">
            <article className="how-card">
              <div className="step-number">1</div>
              <h3>Objavi zadatak</h3>
              <p>
                Opiši šta treba uraditi, odaberi grad i napiši
                koliko želiš platiti.
              </p>
            </article>

            <article className="how-card">
              <div className="step-number">2</div>
              <h3>Odaberi pomagača</h3>
              <p>
                Pomagači se mogu javiti na zadatak. Pogledaj
                njihove ocjene i broj završenih poslova prije
                nego odabereš.
              </p>
            </article>

            <article className="how-card">
              <div className="step-number">3</div>
              <h3>Završi i ocijeni</h3>
              <p>
                Kada je posao završen, osoba koja je objavila
                zadatak može ocijeniti izabranog pomagača sa
                1–5 zvjezdica.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="trust-box">
            <div>
              <h2>Dobar rad gradi dobru reputaciju.</h2>

              <p>
                Rating, broj ocjena i završeni poslovi pripadaju
                samo pomagačima. Osoba koja objavljuje zadatak
                nema rating na Sredi.
              </p>
            </div>

            {!user ? (
              <button
                className="btn btn-dark"
                onClick={() => openAuth()}
              >
                Napravi profil
              </button>
            ) : (
              <button
                className="btn btn-dark"
                onClick={() => setShowMyProfile(true)}
              >
                Moj profil
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-row">
          <div className="logo">
            SREDI<span>.ba</span>
          </div>

          <p>
            © 2026 Sredi.ba · Ljudi pomažu ljudima 🇧🇦
          </p>
        </div>
      </footer>

      {showJobForm && (
        <div
          className="modal"
          onClick={() => setShowJobForm(false)}
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>Objavi zadatak</h2>
                <p>Reci pomagačima šta trebaš.</p>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setShowJobForm(false)}
              >
                ×
              </button>
            </div>

            <form
              className="form"
              onSubmit={handleJobContinue}
            >
              <label>
                Naziv zadatka
                <input
                  name="title"
                  value={jobForm.title}
                  onChange={handleJobFormChange}
                  placeholder="Npr. montaža ormara"
                  required
                />
              </label>

              <label>
                Kategorija
                <select
                  name="category"
                  value={jobForm.category}
                  onChange={handleJobFormChange}
                  required
                >
                  <option value="">
                    Odaberi kategoriju
                  </option>

                  {categories.map((item) => (
                    <option
                      value={item.name}
                      key={item.name}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Grad
                <input
                  name="city"
                  value={jobForm.city}
                  onChange={handleJobFormChange}
                  placeholder="Npr. Sarajevo"
                  required
                />
              </label>

              <label>
                Budžet
                <input
                  name="budget"
                  type="number"
                  min="1"
                  value={jobForm.budget}
                  onChange={handleJobFormChange}
                  placeholder="KM"
                  required
                />
              </label>

              <label>
                Opis zadatka
                <textarea
                  name="description"
                  value={jobForm.description}
                  onChange={handleJobFormChange}
                  placeholder="Opiši šta treba uraditi..."
                  required
                />
              </label>

              <button
                type="submit"
                className="btn btn-dark btn-wide"
              >
                Objavi zadatak
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedJob && (
        <div
          className="modal"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>{selectedJob.title}</h2>

                <p>
                  📍 {selectedJob.city} ·{" "}
                  {selectedJob.category}
                </p>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setSelectedJob(null)}
              >
                ×
              </button>
            </div>

            <p>{selectedJob.description}</p>

            <div className="job-modal-price">
              {selectedJob.price} KM
            </div>

            <p className="job-owner">
              Objavio: {selectedJob.owner}
            </p>

            <div className="form">
              <textarea
                placeholder="Napiši kratku poruku osobi koja je objavila zadatak..."
              />

              <button
                className="btn btn-dark"
                onClick={() => handleApply(selectedJob)}
              >
                Javi se za zadatak
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedHelper && (
        <div
          className="modal"
          onClick={() => setSelectedHelper(null)}
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>{selectedHelper.name}</h2>
                <p>📍 {selectedHelper.city}</p>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setSelectedHelper(null)}
              >
                ×
              </button>
            </div>

            <div className="profile-hero">
              <div className="profile-avatar">
                {selectedHelper.initials}
              </div>

              <div>
                <strong>{selectedHelper.name}</strong>
                <div className="helper-city">
                  Pomagač na Sredi
                </div>
              </div>
            </div>

            <div className="profile-rating">
              <div>
                <strong className="rating">
                  ★ {selectedHelper.rating.toFixed(1)}
                </strong>

                <span>
                  {selectedHelper.reviewCount} ocjena
                </span>
              </div>

              <div>
                <strong>
                  {selectedHelper.completedJobs}
                </strong>

                <span>završenih poslova</span>
              </div>
            </div>

            <p>{selectedHelper.bio}</p>

            <div className="tags">
              {selectedHelper.skills.map((skill) => (
                <span className="tag" key={skill}>
                  {skill}
                </span>
              ))}
            </div>

            <div className="rating-explanation">
              Ocjene se prikazuju samo na profilima pomagača.
              Nakon završenog zadatka osoba koja je objavila
              zadatak može ocijeniti izabranog pomagača.
            </div>
          </div>
        </div>
      )}

      {showMyProfile && user && (
        <div
          className="modal"
          onClick={() => setShowMyProfile(false)}
        >
          <div
            className="modal-card modal-card-large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>Moj profil</h2>
                <p>Tvoj Sredi profil</p>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setShowMyProfile(false)}
              >
                ×
              </button>
            </div>

            <div className="profile-hero">
              <div className="profile-avatar">
                {getInitials(userName)}
              </div>

              <div>
                <strong>{userName}</strong>

                <div className="profile-role">
                  {isHelper ? "Pomagač" : "Tražim pomoć"}
                </div>

                <p className="profile-email">
                  {user.email}
                </p>
              </div>
            </div>

            {isHelper ? (
              <>
                <div className="profile-rating">
                  <div>
                    <strong className="rating">
                      ★ —
                    </strong>
                    <span>0 ocjena</span>
                  </div>

                  <div>
                    <strong>0</strong>
                    <span>završenih poslova</span>
                  </div>
                </div>

                <div className="rating-explanation">
                  Ovo je profil pomagača. Rating će se računati
                  iz ocjena koje dobiješ nakon završenih
                  zadataka. Novi profil počinje bez ocjena i sa
                  0 završenih poslova.
                </div>
              </>
            ) : (
              <div className="dashboard-box">
                <h3>Tražim pomoć</h3>
                <p>
                  Ovaj profil služi za objavljivanje zadataka i
                  pronalazak pomagača. Rating se ne prikazuje na
                  profilima osoba koje traže pomoć.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showMyJobs && user && (
        <div
          className="modal"
          onClick={() => setShowMyJobs(false)}
        >
          <div
            className="modal-card modal-card-large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>
                  {isHelper ? "Moji poslovi" : "Moji zadaci"}
                </h2>

                <p>
                  {isHelper
                    ? "Poslovi na koje si se prijavio i koje si završio."
                    : "Zadaci koje si objavio na Sredi."}
                </p>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setShowMyJobs(false)}
              >
                ×
              </button>
            </div>

            <div className="dashboard-box">
              <h3>
                {isHelper
                  ? "Još nema poslova"
                  : "Još nema zadataka"}
              </h3>

              <p>
                {isHelper
                  ? "Kada povežemo prijave sa bazom, ovdje ćeš vidjeti svoje aktivne i završene poslove."
                  : "Kada povežemo objavljivanje sa bazom, ovdje ćeš vidjeti svoje aktivne i završene zadatke."}
              </p>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => {
            setShowAuth(false);
            setNotice("");
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {notice && !showAuth && (
        <div className="floating-notice">
          <div className="notice">
            {notice}
          </div>
        </div>
      )}

      {showAuth && notice && (
        <div className="floating-notice">
          <div className="notice">
            {notice}
          </div>
        </div>
      )}
    </main>
  );
}
