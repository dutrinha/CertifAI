// src/Screens/WelcomeScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../context/AuthContext';
import { User } from 'lucide-react-native';

// Cores (baseadas na sua LoginScreen)
const cores = {
  primary: '#00C853',
  light: '#FFFFFF',
  secondary: '#1A202C',
  gray100: '#F1F5F9',
  gray500: '#64748B',
};

export default function WelcomeScreen({ navigation }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nome inválido', 'Por favor, insira seu nome para continuar.');
      return;
    }

    setLoading(true);
    try {
      // 1. Salva o nome no user_metadata do Supabase
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmedName }
      });

      if (error) throw error;

      // 2. Navega para o fluxo principal de onboarding
      // Usamos 'replace' para que o usuário não possa "voltar"
      navigation.replace('OnboardingFlow');

    } catch (e) {
      console.error("Erro ao salvar nome:", e);
      Alert.alert('Erro', 'Não foi possível salvar seu nome. Tente novamente.');
      setLoading(false);
    }
    // Não precisamos setar loading(false) em caso de sucesso
    // pois a tela será substituída.
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.scrollContent}>
          <Text style={styles.title}>Boas-vindas!</Text>
          <Text style={styles.subtitle}>Para começar, como podemos te chamar?</Text>

          <View style={styles.inputContainer}>
            <User size={20} color={cores.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Digite seu nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholderTextColor={cores.gray500}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !name) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading || !name}>
            {loading ? (
              <ActivityIndicator color={cores.light} />
            ) : (
              <Text style={styles.buttonText}>Continuar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos (baseados na sua LoginScreen.js)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.light },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: cores.secondary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: cores.gray500, textAlign: 'center', marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: cores.gray100,
    borderRadius: 12, marginBottom: 16, paddingHorizontal: 12, borderWidth: 1,
    borderColor: cores.gray100,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: 16, color: cores.secondary },
  button: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row',
    backgroundColor: cores.primary,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },
});