"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthModal({
  onClose,
  onAuthSuccess,
}) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
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
              role,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Profil je uspješno kreiran.");

          if (onAuthSuccess && data.user) {
            await onAuthSuccess(data.user);
          }
        } else {
          setMessage(
            "Profil je kreiran. Provjeri email i potvrdi registraciju."
          );
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) throw error;

        setMessage("Uspješno ste prijavljeni.");

        if (onAuthSuccess && data.user) {
          await onAuthSuccess(data.user);
        }
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
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="v2-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head-v2">
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
            className="modal-close"
            onClick={onClose}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <form
          className="modal-form"
          onSubmit={handleSubmit}
        >
          {mode === "signup" && (
            <>
              <label className="field">
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

              <label className="field">
                Kako želiš koristiti Sredi?

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value)
                  }
                  required
                >
                  <option value="customer">
                    Tražim pomoć
                  </option>

                  <option value="helper">
                    Želim biti pomagač
                  </option>
                </select>
              </label>

              <div className="notice-global">
                {role === "helper"
                  ? "Kao pomagač možeš pronaći zadatke, slati ponude i graditi svoj rating."
                  : "Objavi zadatak i pronađi odgovarajućeg pomagača."}
              </div>
            </>
          )}

          <label className="field">
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

          <label className="field">
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
            className="btn btn-dark"
            disabled={loading}
          >
            {loading
              ? "Molimo sačekajte..."
              : mode === "login"
                ? "Prijavi se"
                : "Napravi profil"}
          </button>

          {message && (
            <div className="notice-global">
              {message}
            </div>
          )}

          <button
            type="button"
            className="btn"
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
