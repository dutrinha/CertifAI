// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suas credenciais do Supabase (melhor centralizadas aqui)
const SUPABASE_URL = 'https://eojpsitiyrgndjrcmeic.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvanBzaXRpeXJnbmRqcmNtZWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDQxMzgsImV4cCI6MjA3NjAyMDEzOH0.1DnI26htw_o_3Ex81suiCsq9qz84STBbVa11MbDr2jY';

// Crie o cliente Supabase uma única vez
// Adicionamos o AsyncStorage para persistência da sessão no React Native
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante para React Native
  },
});

// Crie o Context
const AuthContext = createContext({
  session: null,
  user: null,
  loading: true, // Começa como true para verificar a sessão inicial
});

// Crie o Provedor do Contexto
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // 1. Tenta pegar a sessão existente ao carregar o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Escuta mudanças no estado de autenticação (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // Garante que parou de carregar após a mudança
      }
    );

    // 3. Limpa o listener quando o componente desmontar
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading, // Exporta o estado de loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook customizado para usar o contexto facilmente
export const useAuth = () => {
  return useContext(AuthContext);
};