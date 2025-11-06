// /src/context/ContentContext.js
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, useAuth } from './AuthContext'; // Importa do seu AuthContext

// Chave do cache e tempo de expiração (24 horas)
const TOPICS_CACHE_KEY = '@CertifAI_TopicsCache_v3';
const CACHE_EXPIRATION_MS = 1000 * 60 * 60 * 24; 

// 1. Cria o Contexto
const ContentContext = createContext({
  loading: true,
  error: null,
  allTopics: [], // Armazena a lista de { modulo: "...", prova: "..." }
  getTopicsForProva: (prova) => [], // Função helper
});

// Tela de Loading Padrão
const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#00C853" />
    <Text style={styles.loadingText}>Carregando tópicos de estudo...</Text>
  </View>
);

// 2. Cria o Provedor (Provider)
export const ContentProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allTopics, setAllTopics] = useState([]); // Array de { modulo, prova }

  useEffect(() => {
    // Só carrega o conteúdo se o usuário estiver logado.
    if (user) {
      loadTopics();
    }
  }, [user]); // Roda quando o usuário loga

  // Função para buscar tópicos do Supabase (e salvar no cache)
  const fetchTopicsFromSupabase = async (isSilentUpdate = false) => {
    if (!isSilentUpdate) setLoading(true);
    
    try {
      // Chama a RPC que você criou no Passo 5(a)
      const { data, error } = await supabase.rpc('fn_get_all_topics');
      if (error) throw error;

      // Salva os dados no estado e no cache
      setAllTopics(data || []);
      const cacheData = JSON.stringify({
        topics: data || [],
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(TOPICS_CACHE_KEY, cacheData);
      console.log("ContentContext: Tópicos atualizados do Supabase!");

    } catch (e) {
      console.error("Erro ao buscar tópicos:", e);
      if (!isSilentUpdate) {
        setError("Não foi possível carregar os tópicos de estudo.");
      }
    } finally {
      if (!isSilentUpdate) setLoading(false);
    }
  };

  // Função para carregar os tópicos (do cache ou do Supabase)
  const loadTopics = async () => {
    try {
      setLoading(true);
      const cachedJson = await AsyncStorage.getItem(TOPICS_CACHE_KEY);

      if (cachedJson) {
        const { topics, timestamp } = JSON.parse(cachedJson);
        setAllTopics(topics || []);
        setLoading(false); // <--- App roda imediatamente com dados do cache

        // Verifica se o cache expirou (ex: > 24h)
        if (Date.now() - timestamp > CACHE_EXPIRATION_MS) {
          console.log("ContentContext: Cache de tópicos expirado. Buscando em segundo plano...");
          fetchTopicsFromSupabase(true); // Atualização silenciosa
        } else {
          console.log("ContentContext: Usando tópicos do cache.");
        }
      } else {
        // Sem cache, busca pela primeira vez (mostrando loading)
        console.log("ContentContext: Nenhum cache de tópicos. Buscando do Supabase...");
        await fetchTopicsFromSupabase(false);
      }
    } catch (e) {
      console.error("Erro ao carregar tópicos:", e);
      setError("Erro ao carregar dados.");
      setLoading(false);
    }
  };

  // O 'value' que o Provedor vai fornecer para o app
const value = useMemo(() => {
    
    // Esta é a FUNÇÃO HELPER que suas páginas vão usar.
    // Ela recebe a prova (ex: 'cpa') e retorna a lista de tópicos
    // (ex: ['Tópico A', 'Tópico B'])
const getTopicsForProva = (prova) => {
      // V V V V V VERSÃO COM CAPITALIZAÇÃO V V V V V
      if (!allTopics || allTopics.length === 0 || !prova) {
        return [];
      }

      const provaLimpa = prova.toLowerCase().trim();

      // Função helper rápida para capitalizar
      const capitalizeFirstLetter = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      const topicosFiltrados = allTopics
        .filter(topic => (topic.prova || '').toLowerCase().trim() === provaLimpa)
        .map(topic => capitalizeFirstLetter(topic.modulo)); // <--- MUDANÇA AQUI
      
      return topicosFiltrados;
      // ^ ^ ^ ^ ^ VERSÃO COM CAPITALIZAÇÃO ^ ^ ^ ^ ^
    };

    return {
      loading,
      error,
      allTopics, // A lista completa, se precisar
      getTopicsForProva, // A função helper
    };
  }, [loading, error, allTopics]); // Recalcula o 'value' quando os dados mudam
  
  // Se deu erro e NÃO temos nada no cache (primeiro login falhou)
  if (error && allTopics.length === 0) {
    return (
       <View style={styles.loadingContainer}>
         <Text style={styles.errorText}>Erro Crítico</Text>
         <Text style={styles.errorSubText}>{error}</Text>
       </View>
    );
  }

  // Se tudo estiver OK (ou se tivermos cache), renderiza o app.
  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};

// 3. Hook customizado (para usar o contexto facilmente)
export const useContent = () => {
  return useContext(ContentContext);
};

// Estilos para as telas de loading/erro
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC', // Cor 'background'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B', // Cor 'textSecondary'
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626', // Cor 'redText'
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#64748B', // Cor 'textSecondary'
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});