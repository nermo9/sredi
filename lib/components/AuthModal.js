"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Profil je kreiran. Prijavljeni ste.");
        } else {
          setMessage(
            "Profil je kreiran. Provjerite email i potvrdite registraciju."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("Uspješno ste prijavljeni.");
      }
    } catch (error) {
      setMessage(error.message || "Došlo je do greške.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>
              {mode === "login"
                ? "Prijavi se"
                : "Napravi profil"}
            </h2>

            <p className="muted">
              {mode === "login"
                ? "Dobrodošao nazad na Sredi."
                : "Kreiraj svoj Sredi profil."}
            </p>
          </div>

          <button
            type="button"
            className="close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Ime i prezime"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button
            className="btn btn-dark"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Molimo sačekajte..."
              : mode === "login"
              ? "Prijavi se"
              : "Napravi profil"}
          </button>

          {message && <p className="muted">{message}</p>}

          <button
            className="btn btn-light"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login"
              ? "Nemate profil? Registrujte se"
              : "Već imate profil? Prijavite se"}
          </button>
        </form>
      </div>
    </div>
  );
}
