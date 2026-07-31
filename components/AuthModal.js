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

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setMessage("Profil je uspješno kreiran.");
        } else {
          setMessage(
            "Profil je kreiran. Provjeri email i potvrdi registraciju."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        setMessage("Uspješno ste prijavljeni.");
      }
    } catch (error) {
      setMessage(
        error?.message ||
          "Došlo je do greške. Pokušaj ponovo."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) =>
      current === "login" ? "signup" : "login"
    );

    setMessage("");
  }

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>
              {mode === "login"
                ? "Prijavi se"
                : "Napravi profil"}
            </h2>

            <p>
              {mode === "login"
                ? "Dobrodošao nazad na Sredi."
                : "Kreiraj svoj Sredi profil."}
            </p>
          </div>

          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Ime i prezime
              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ime i prezime"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Lozinka
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Lozinka"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            className="btn btn-dark btn-wide"
            disabled={loading}
          >
            {loading
              ? "Molimo sačekajte..."
              : mode === "login"
                ? "Prijavi se"
                : "Napravi profil"}
          </button>

          {message && (
            <div className="notice">
              {message}
            </div>
          )}

          <button
            type="button"
            className="btn btn-light btn-wide"
            onClick={switchMode}
            disabled={loading}
          >
            {mode === "login"
              ? "Nemaš profil? Registruj se"
              : "Već imaš profil? Prijavi se"}
          </button>
        </form>
      </div>
    </div>
  );
}
