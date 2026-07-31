"use client";

import { useMemo, useState } from "react";

const jobs = [

  {

    id: 1,

    icon: "🧹",

    title: "Čišćenje stana",

    city: "Sarajevo",

    price: "80 KM",

    category: "Čišćenje",

    description: "Potrebna pomoć oko čišćenja stana.",

    owner: "Amir K.",

  },

  {

    id: 2,

    icon: "📦",

    title: "Pomoć pri selidbi",

    city: "Banja Luka",

    price: "120 KM",

    category: "Selidbe",

    description: "Tražim dvije osobe za pomoć pri selidbi.",

    owner: "Marko P.",

  },

  {

    id: 3,

    icon: "🌱",

    title: "Košenje trave",

    city: "Mostar",

    price: "60 KM",

    category: "Kuća & bašta",

    description: "Potrebno pokositi dvorište.",

    owner: "Lejla H.",

  },

  {

    id: 4,

    icon: "🔧",

    title: "Montaža namještaja",

    city: "Tuzla",

    price: "90 KM",

    category: "Montaža",

    description: "Montaža ormara i komode.",

    owner: "Haris S.",

  },

  {

    id: 5,

    icon: "🚗",

    title: "Preuzimanje i dostava",

    city: "Zenica",

    price: "45 KM",

    category: "Prevoz",

    description: "Preuzeti paket i dostaviti ga na adresu.",

    owner: "Emina B.",

  },

  {

    id: 6,

    icon: "🏠",

    title: "Pregled kuće",

    city: "Bihać",

    price: "100 KM",

    category: "Nekretnine",

    description: "Potreban pregled kuće prije kupovine.",

    owner: "Adnan M.",

  },

];

const categories = [

  ["🧹", "Čišćenje"],

  ["📦", "Selidbe"],

  ["🌿", "Kuća & bašta"],

  ["🔧", "Montaža"],

  ["🚗", "Prevoz"],

  ["🛠️", "Praktična pomoć"],

  ["🏠", "Nekretnine"],

  ["✨", "Ostalo"],

];

const helpers = [

  {

    id: 1,

    name: "Amar H.",

    city: "Sarajevo",

    initials: "AH",

    rating: 4.9,

    reviews: 47,

    completed: 63,

    categories: ["Montaža", "Selidbe", "Praktična pomoć"],

    bio: "Pouzdan, brz i uvijek spreman pomoći.",

  },

  {

    id: 2,

    name: "Lejla M.",

    city: "Mostar",

    initials: "LM",

    rating: 5.0,

    reviews: 31,

    completed: 38,

    categories: ["Čišćenje", "Kuća & bašta"],

    bio: "Pažljiva i odgovorna pomoć za dom i baštu.",

  },

  {

    id: 3,

    name: "Adnan K.",

    city: "Tuzla",

    initials: "AK",

    rating: 4.8,

    reviews: 82,

    completed: 104,

    categories: ["Prevoz", "Selidbe", "Montaža"],

    bio: "Iskusan pomagač sa više od 100 završenih poslova.",

  },

];

export default function Home() {

  const [mode, setMode] = useState("help");

  const [query, setQuery] = useState("");

  const [category, setCategory] = useState("Sve");

  const [city, setCity] = useState("Cijela BiH");

  const [showJobForm, setShowJobForm] = useState(false);

  const [showLogin, setShowLogin] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);

  const [selectedHelper, setSelectedHelper] = useState(null);

  const filteredJobs = useMemo(() => {

    return jobs.filter((job) => {

      const search = query.toLowerCase().trim();

      const matchesSearch =

        !search ||

        job.title.toLowerCase().includes(search) ||

        job.description.toLowerCase().includes(search) ||

        job.city.toLowerCase().includes(search) ||

        job.category.toLowerCase().includes(search);

      const matchesCategory =

        category === "Sve" || job.category === category;

      const matchesCity =

        city === "Cijela BiH" || job.city === city;

      return matchesSearch && matchesCategory && matchesCity;

    });

  }, [query, category, city]);

  return (

    <main>

      <style jsx global>{`

        * {

          box-sizing: border-box;

        }

        html {

          scroll-behavior: smooth;

        }

        body {

          margin: 0;

          background: #f7f8f5;

          color: #17231e;

          font-family: Arial, Helvetica, sans-serif;

        }

        button,

        input,

        select,

        textarea {

          font: inherit;

        }

        button {

          cursor: pointer;

        }

        .container {

          width: min(1160px, calc(100% - 36px));

          margin: auto;

        }

        nav {

          height: 76px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          border-bottom: 1px solid #e0e3de;

        }

        .logo {

          font-size: 26px;

          font-weight: 900;

          letter-spacing: -1px;

        }

        .logo span {

          font-weight: 500;

        }

        .nav-right {

          display: flex;

          gap: 10px;

          align-items: center;

        }

        .nav-link {

          border: 0;

          background: transparent;

          font-weight: 700;

          padding: 11px;

          color: #17231e;

        }

        .btn {

          border: 0;

          border-radius: 11px;

          padding: 13px 17px;

          font-weight: 800;

        }

        .btn-dark {

          background: #17231e;

          color: white;

        }

        .btn-light {

          background: white;

          color: #17231e;

          border: 1px solid #dfe3de;

        }

        .hero {

          padding: 70px 0 65px;

        }

        .pill {

          display: inline-block;

          background: #e2eee6;

          padding: 9px 13px;

          border-radius: 999px;

          font-size: 12px;

          font-weight: 800;

        }

        h1 {

          font-size: clamp(60px, 9vw, 105px);

          line-height: 0.88;

          letter-spacing: -6px;

          margin: 25px 0;

        }

        .lead {

          max-width: 650px;

          font-size: 19px;

          line-height: 1.55;

          color: #68736d;

        }

        .hero-actions {

          display: flex;

          gap: 10px;

          margin: 27px 0;

        }

        .search {

          display: grid;

          grid-template-columns: 1fr 200px;

          max-width: 800px;

          background: white;

          border: 1px solid #dfe3de;

          border-radius: 13px;

          overflow: hidden;

        }

        .search input,

        .search select {

          border: 0;

          outline: none;

          background: white;

          padding: 17px;

        }

        .search select {

          border-left: 1px solid #e2e5e1;

        }

        section {

          padding: 65px 0;

        }

        .section-head {

          display: flex;

          justify-content: space-between;

          align-items: end;

          gap: 20px;

          margin-bottom: 28px;

        }

        h2 {

          margin: 0;

          font-size: 39px;

          letter-spacing: -2px;

        }

        .muted {

          color: #6d7771;

          line-height: 1.5;

        }

        .categories {

          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 12px;

        }

        .category {

          background: white;

          border: 1px solid #e0e4df;

          border-radius: 16px;

          padding: 22px;

          min-height: 110px;

          text-align: left;

          color: #17231e;

        }

        .category.active {

          background: #17231e;

          color: white;

        }

        .category-icon {

          display: block;

          font-size: 26px;

          margin-bottom: 15px;

        }

        .category-name {

          font-weight: 800;

        }

        .jobs {

          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 15px;

        }

        .job {

          background: white;

          border: 1px solid #e0e4df;

          border-radius: 18px;

          padding: 22px;

        }

        .job-icon {

          width: 50px;

          height: 50px;

          border-radius: 14px;

          display: grid;

          place-items: center;

          background: #eef1ec;

          font-size: 24px;

        }

        .job h3 {

          font-size: 20px;

          margin: 22px 0 8px;

        }

        .job-description {

          min-height: 55px;

          color: #68736d;

          line-height: 1.5;

          font-size: 14px;

        }

        .job-meta {

          font-size: 13px;

          color: #6d7771;

          margin-top: 15px;

        }

        .job-owner {

          font-size: 13px;

          color: #6d7771;

          margin-top: 6px;

        }

        .job-bottom {

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 12px;

          border-top: 1px solid #eceeea;

          padding-top: 17px;

          margin-top: 18px;

        }

        .price {

          font-size: 21px;

          font-weight: 900;

        }

        .helpers-section {

          background: #17231e;

          color: white;

        }

        .helpers-section .muted {

          color: #b2bdb6;

        }

        .helpers {

          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 15px;

        }

        .helper {

          background: #213029;

          border: 1px solid #34443b;

          border-radius: 18px;

          padding: 23px;

        }

        .helper-top {

          display: flex;

          align-items: center;

          gap: 14px;

        }

        .avatar {

          width: 57px;

          height: 57px;

          border-radius: 50%;

          display: grid;

          place-items: center;

          background: #dce9dc;

          color: #17231e;

          font-weight: 900;

          font-size: 17px;

        }

        .helper-name {

          font-size: 20px;

          font-weight: 900;

        }

        .helper-city {

          color: #b5bfb9;

          font-size: 13px;

          margin-top: 4px;

        }

        .stats {

          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 10px;

          border-top: 1px solid #35463c;

          border-bottom: 1px solid #35463c;

          margin: 20px 0;

          padding: 17px 0;

        }

        .stat strong {

          display: block;

          font-size: 20px;

          margin-bottom: 5px;

        }

        .stat span {

          font-size: 12px;

          color: #b5bfb9;

        }

        .stars {

          color: #f2b84b;

        }

        .helper-bio {

          color: #c4cdc7;

          font-size: 14px;

          line-height: 1.55;

        }

        .tags {

          display: flex;

          flex-wrap: wrap;

          gap: 7px;

          margin: 18px 0;

        }

        .tag {

          background: #304238;

          padding: 7px 9px;

          border-radius: 999px;

          font-size: 11px;

          font-weight: 700;

        }

        .helper-button {

          width: 100%;

          border: 0;

          border-radius: 10px;

          padding: 12px;

          background: white;

          color: #17231e;

          font-weight: 900;

        }

        .how {

          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 18px;

        }

        .step {

          background: white;

          border: 1px solid #e0e4df;

          border-radius: 17px;

          padding: 25px;

        }

        .number {

          width: 42px;

          height: 42px;

          border-radius: 50%;

          background: #17231e;

          color: white;

          display: grid;

          place-items: center;

          font-weight: 900;

        }

        .step h3 {

          margin: 20px 0 9px;

        }

        .step p {

          color: #6d7771;

          line-height: 1.55;

        }

        .trust {

          background: #e2eee6;

          border-radius: 25px;

          padding: 45px;

          margin-bottom: 65px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 30px;

        }

        .trust h2 {

          max-width: 600px;

        }

        footer {

          border-top: 1px solid #e0e3de;

          padding: 35px 0 50px;

          color: #707a74;

          font-size: 13px;

        }

        .modal {

          position: fixed;

          inset: 0;

          z-index: 100;

          background: rgba(15, 27, 20, 0.7);

          display: grid;

          place-items: center;

          padding: 18px;

        }

        .modal-card {

          width: min(500px, 100%);

          max-height: 90vh;

          overflow-y: auto;

          background: #f7f8f5;

          color: #17231e;

          border-radius: 20px;

          padding: 25px;

        }

        .modal-head {

          display: flex;

          justify-content: space-between;

          align-items: start;

          gap: 20px;

          margin-bottom: 20px;

        }

        .modal-head h2 {

          font-size: 30px;

        }

        .close {

          border: 0;

          background: transparent;

          font-size: 28px;

        }

        .form {

          display: grid;

          gap: 11px;

        }

        .form input,

        .form select,

        .form textarea {

          width: 100%;

          border: 1px solid #dce1dc;

          border-radius: 11px;

          padding: 14px;

          background: white;

          outline: none;

        }

        .form textarea {

          min-height: 110px;

          resize: vertical;

        }

        .helper-profile-rating {

          background: #17231e;

          color: white;

          border-radius: 15px;

          padding: 20px;

          margin: 18px 0;

        }

        .helper-profile-rating strong {

          font-size: 28px;

        }

        @media (max-width: 800px) {

          .container {

            width: calc(100% - 26px);

          }

          nav {

            height: 68px;

          }

          .nav-link {

            display: none;

          }

          .hero {

            padding: 50px 0;

          }

          h1 {

            font-size: 60px;

            letter-spacing: -4px;

          }

          .lead {

            font-size: 16px;

          }

          .search {

            grid-template-columns: 1fr;

          }

          .search select {

            border-left: 0;

            border-top: 1px solid #e2e5e1;

          }

          .categories {

            grid-template-columns: repeat(2, 1fr);

          }

          .jobs,

          .helpers,

          .how {

            grid-template-columns: 1fr;

          }

          .section-head {

            align-items: start;

            flex-direction: column;

          }

          h2 {

            font-size: 32px;

          }

          section {

            padding: 50px 0;

          }

          .trust {

            padding: 30px;

            flex-direction: column;

            align-items: start;

          }

        }

      `}</style>

      <div className="container">

        <nav>

          <div className="logo">

            SREDI<span>.ba</span>

          </div>

          <div className="nav-right">

            <button

              className="nav-link"

              onClick={() =>

                document

                  .getElementById("jobs")

                  ?.scrollIntoView({ behavior: "smooth" })

              }

            >

              Poslovi

            </button>

            <button

              className="nav-link"

              onClick={() =>

                document

                  .getElementById("helpers")

                  ?.scrollIntoView({ behavior: "smooth" })

              }

            >

              Pomagači

            </button>

            <button

              className="btn btn-light"

              onClick={() => setShowLogin(true)}

            >

              Prijavi se

            </button>

            <button

              className="btn btn-dark"

              onClick={() => setShowJobForm(true)}

            >

              Objavi zadatak

            </button>

          </div>

        </nav>

        <div className="hero">

          <div className="pill">

            🇧🇦 Pomoć širom Bosne i Hercegovine

          </div>

          <h1>

            Treba ti pomoć?

            <br />

            Sredi.

          </h1>

          <p className="lead">

            Objavi šta trebaš. Pronađi osobu u svojoj blizini.

            Ili zaradi pomažući drugima.

          </p>

          <div className="hero-actions">

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

                document

                  .getElementById("jobs")

                  ?.scrollIntoView({ behavior: "smooth" });

              }}

            >

              Želim zaraditi

            </button>

          </div>

          <div className="search">

            <input

              value={query}

              onChange={(e) => setQuery(e.target.value)}

              placeholder={

                mode === "earn"

                  ? "Pretraži poslove..."

                  : "Šta trebaš srediti?"

              }

            />

            <select

              value={city}

              onChange={(e) => setCity(e.target.value)}

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

        </div>

      </div>

      <section>

        <div className="container">

          <div className="section-head">

            <div>

              <h2>Šta trebaš srediti?</h2>

              <p className="muted">

                Odaberi kategoriju i pronađi pravu pomoć.

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

            {categories.map(([icon, name]) => (

              <button

                key={name}

                className={

                  category === name

                    ? "category active"

                    : "category"

                }

                onClick={() =>

                  setCategory(

                    category === name ? "Sve" : name

                  )

                }

              >

                <span className="category-icon">{icon}</span>

                <span className="category-name">{name}</span>

              </button>

            ))}

          </div>

        </div>

      </section>

      <section id="jobs">

        <div className="container">

          <div className="section-head">

            <div>

              <h2>Aktuelni poslovi</h2>

              <p className="muted">

                {filteredJobs.length} dostupnih zadataka.

              </p>

            </div>

            <button

              className="btn btn-dark"

              onClick={() => setShowJobForm(true)}

            >

              + Objavi zadatak

            </button>

          </div>

          <div className="jobs">

            {filteredJobs.map((job) => (

              <article className="job" key={job.id}>

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

                <div className="job-bottom">

                  <div className="price">{job.price}</div>

                  <button

                    className="btn btn-dark"

                    onClick={() => setSelectedJob(job)}

                  >

                    Zainteresovan sam

                  </button>

                </div>

              </article>

            ))}

          </div>

        </div>

      </section>

      <section className="helpers-section" id="helpers">

        <div className="container">

          <div className="section-head">

            <div>

              <h2>Pouzdani pomagači</h2>

              <p className="muted">

                Ocjene pripadaju isključivo pomagačima i

                dolaze od korisnika kojima su završili posao.

              </p>

            </div>

          </div>

          <div className="helpers">

            {helpers.map((helper) => (

              <article className="helper" key={helper.id}>

                <div className="helper-top">

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

                <div className="stats">

                  <div className="stat">

                    <strong className="stars">

                      ★ {helper.rating.toFixed(1)}

                    </strong>

                    <span>

                      {helper.reviews} ocjena

                    </span>

                  </div>

                  <div className="stat">

                    <strong>

                      {helper.completed}

                    </strong>

                    <span>

                      završenih poslova

                    </span>

                  </div>

                </div>

                <p className="helper-bio">

                  {helper.bio}

                </p>

                <div className="tags">

                  {helper.categories.map((item) => (

                    <span className="tag" key={item}>

                      {item}

                    </span>

                  ))}

                </div>

                <button

                  className="helper-button"

                  onClick={() =>

                    setSelectedHelper(helper)

                  }

                >

                  Pogledaj profil

                </button>

              </article>

            ))}

          </div>

        </div>

      </section>

      <section>

        <div className="container">

          <div className="section-head">

            <div>

              <h2>Kako radi Sredi?</h2>

              <p className="muted">

                Od objave do završene pomoći.

              </p>

            </div>

          </div>

          <div className="how">

            <div className="step">

              <div className="number">1</div>

              <h3>Objavi zadatak</h3>

              <p>

                Napiši šta treba uraditi, gdje se zadatak

                nalazi i koliko želiš platiti.

              </p>

            </div>

            <div className="step">

              <div className="number">2</div>

              <h3>Odaberi pomagača</h3>

              <p>

                Zainteresovani pomagači se javljaju.

                Pogledaj njihove ocjene i broj završenih

                poslova prije nego odabereš.

              </p>

            </div>

            <div className="step">

              <div className="number">3</div>

              <h3>Završi i ocijeni</h3>

              <p>

                Nakon završenog posla, osoba koja je objavila

                zadatak može ocijeniti pomagača sa 1–5

                zvjezdica.

              </p>

            </div>

          </div>

        </div>

      </section>

      <div className="container">

        <div className="trust">

          <div>

            <h2>

              Dobar rad gradi dobru reputaciju.

            </h2>

            <p className="muted">

              Svaki završeni posao povećava broj završenih

              zadataka pomagača. Ocjene mogu ostaviti samo

              korisnici nakon stvarno završenog zadatka.

            </p>

          </div>

          <button

            className="btn btn-dark"

            onClick={() => setShowLogin(true)}

          >

            Napravi profil

          </button>

        </div>

      </div>

      <footer>

        <div className="container">

          <div className="logo">

            SREDI<span>.ba</span>

          </div>

          <p>

            Ljudi pomažu ljudima. 🇧🇦

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

            onClick={(e) => e.stopPropagation()}

          >

            <div className="modal-head">

              <div>

                <h2>Objavi zadatak</h2>

                <p className="muted">

                  Reci šta trebaš srediti.

                </p>

              </div>

              <button

                className="close"

                onClick={() => setShowJobForm(false)}

              >

                ×

              </button>

            </div>

            <div className="form">

              <input placeholder="Naziv zadatka" />

              <select defaultValue="">

                <option value="" disabled>

                  Odaberi kategoriju

                </option>

                {categories.map(([, name]) => (

                  <option key={name}>

                    {name}

                  </option>

                ))}

              </select>

              <input placeholder="Grad" />

              <input

                type="number"

                min="0"

                placeholder="Budžet u KM"

              />

              <textarea placeholder="Opiši zadatak..." />

              <button

                className="btn btn-dark"

                onClick={() => {

                  setShowJobForm(false);

                  setShowLogin(true);

                }}

              >

                Nastavi

              </button>

              <p className="muted">

                Potreban je korisnički profil za objavu

                zadatka.

              </p>

            </div>

          </div>

        </div>

      )}

      {showLogin && (

        <div

          className="modal"

          onClick={() => setShowLogin(false)}

        >

          <div

            className="modal-card"

            onClick={(e) => e.stopPropagation()}

          >

            <div className="modal-head">

              <div>

                <h2>Dobrodošao na Sredi</h2>

                <p className="muted">

                  Prijavi se ili napravi profil.

                </p>

              </div>

              <button

                className="close"

                onClick={() => setShowLogin(false)}

              >

                ×

              </button>

            </div>

            <div className="form">

              <input

                type="email"

                placeholder="Email"

              />

              <input

                type="password"

                placeholder="Lozinka"

              />

              <button className="btn btn-dark">

                Prijavi se

              </button>

              <button className="btn btn-light">

                Napravi novi profil

              </button>

            </div>

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

            onClick={(e) => e.stopPropagation()}

          >

            <div className="modal-head">

              <div>

                <h2>{selectedJob.title}</h2>

                <p className="muted">

                  📍 {selectedJob.city}

                </p>

              </div>

              <button

                className="close"

                onClick={() => setSelectedJob(null)}

              >

                ×

              </button>

            </div>

            <p>

              {selectedJob.description}

            </p>

            <p>

              <strong>

                {selectedJob.price}

              </strong>

            </p>

            <p className="muted">

              Objavio: {selectedJob.owner}

            </p>

            <div className="form">

              <textarea

                placeholder="Napiši kratku poruku..."

              />

              <button

                className="btn btn-dark"

                onClick={() => {

                  setSelectedJob(null);

                  setShowLogin(true);

                }}

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

            onClick={(e) => e.stopPropagation()}

          >

            <div className="modal-head">

              <div>

                <h2>{selectedHelper.name}</h2>

                <p className="muted">

                  📍 {selectedHelper.city}

                </p>

              </div>

              <button

                className="close"

                onClick={() => setSelectedHelper(null)}

              >

                ×

              </button>

            </div>

            <div className="helper-profile-rating">

              <strong className="stars">

                ★ {selectedHelper.rating.toFixed(1)}

              </strong>

              <p>

                {selectedHelper.reviews} ocjena

                {" · "}

                {selectedHelper.completed} završenih poslova

              </p>

            </div>

            <p>

              {selectedHelper.bio}

            </p>

            <div className="tags">

              {selectedHelper.categories.map((item) => (

                <span className="tag" key={item}>

                  {item}

                </span>

              ))}

            </div>

            <p className="muted">

              Ocjene na Sredi pripadaju pomagaču i nastaju

              nakon završenih poslova.

            </p>

          </div>

        </div>

      )}

    </main>

  );

}
