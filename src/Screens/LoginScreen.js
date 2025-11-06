// src/screens/LoginScreen.jsx (Versão FINAL - Login com Código/OTP + Cooldown)
import React, { useState, useEffect } from 'react'; // <-- Importar useEffect
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { supabase } from '../context/AuthContext';
import { Mail, Hash } from 'lucide-react-native'; // <-- Ícones para email e código

// Cores
const cores = {
  primary: '#00C853',
  light: '#FFFFFF',
  secondary: '#1A202C',
  gray100: '#F1F5F9',
  gray300: '#CBD5E1',
  gray500: '#64748B',
  red500: '#EF4444',
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Controla se o usuário vê a tela de email ou de código
  const [step, setStep] = useState('email');
  
  // Estados para o cooldown de reenvio
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Temporizador para o cooldown
  useEffect(() => {
    let timerId;
    // Se o botão de reenviar estiver desabilitado (em cooldown)
    if (isResendDisabled) {
      // Inicia um intervalo que roda a cada 1 segundo
      timerId = setInterval(() => {
        setCountdown((prev) => {
          // Se o contador chegar a 1 (antes de ir a 0)
          if (prev <= 1) {
            clearInterval(timerId);      // Para o intervalo
            setIsResendDisabled(false);  // Reabilita o botão
            return 60;                   // Reseta o contador para 60s
          }
          // Se for > 1, apenas diminui 1
          return prev - 1;
        });
      }, 1000);
    }

    // Função de "limpeza": se o componente for desmontado,
    // o timer é limpo para evitar vazamento de memória.
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isResendDisabled]); // Esta função roda toda vez que 'isResendDisabled' muda

  // 1. Função para ENVIAR o código para o e-mail
  const handleSendCode = async (isResending = false) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Isso é importante: cria o usuário se ele não existir
          shouldCreateUser: true, 
        },
      });

      if (error) {
        throw error;
      }
      
      // Só avança para a etapa 'token' se NÃO for um reenvio
      if (!isResending) {
        setStep('token'); 
      }
      
      // Inicia o cooldown (em ambos os casos, envio e reenvio)
      setIsResendDisabled(true); 
      
    } catch (e) {
      console.error("Erro ao enviar código:", e);
      setErrorMessage('Erro ao enviar o código. Verifique o e-mail e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Função para VERIFICAR o código e fazer login
  const handleVerifyCode = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email', // Indica que é um OTP de e-mail
      });

      if (error) {
        throw error;
      }
      // Sucesso! O AuthContext vai detectar a nova sessão e navegar automaticamente
      console.log("Sessão verificada:", data.session);

    } catch (e) {
      console.error("Erro ao verificar código:", e);
      setErrorMessage('Código inválido ou expirado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Funções para limpar o erro ao digitar
  const handleEmailChange = (text) => { setEmail(text); if (errorMessage) setErrorMessage(''); };
  const handleTokenChange = (text) => { setToken(text); if (errorMessage) setErrorMessage(''); };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* ----- ETAPA 1: PEDIR O E-MAIL ----- */}
          {step === 'email' && (
            <>
              <Text style={styles.title}>Bem-vindo!</Text>
              <Text style={styles.subtitle}>Digite seu e-mail para entrar ou criar sua conta.</Text>

              <View style={[styles.inputContainer, errorMessage ? styles.inputErrorBorder : null]}>
                <Mail size={20} color={errorMessage ? cores.red500 : cores.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={cores.gray500}
                  textContentType="emailAddress"
                />
              </View>

              {errorMessage ? (<Text style={styles.errorText}>{errorMessage}</Text>) : null}

              <TouchableOpacity
                style={[styles.button, styles.loginButton, (loading || !email) && styles.buttonDisabled]}
                onPress={() => handleSendCode(false)} // Passa 'false' na primeira vez
                disabled={loading || !email}>
                {loading ? (
                  <ActivityIndicator color={cores.light} />
                ) : (
                  <Text style={styles.buttonText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ----- ETAPA 2: PEDIR O CÓDIGO ----- */}
          {step === 'token' && (
            <>
              <Text style={styles.title}>Verifique seu E-mail</Text>
              <Text style={styles.subtitle}>
                Enviamos um código para <Text style={{fontWeight: 'bold'}}>{email}</Text>
              </Text>

              <View style={[styles.inputContainer, errorMessage ? styles.inputErrorBorder : null]}>
                <Hash size={20} color={errorMessage ? cores.red500 : cores.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Código de 6 dígitos"
                  value={token}
                  onChangeText={handleTokenChange}
                  keyboardType="number-pad"
                  maxLength={6} // Importante: 6 dígitos
                  placeholderTextColor={cores.gray500}
                />
              </View>

              {errorMessage ? (<Text style={styles.errorText}>{errorMessage}</Text>) : null}

              <TouchableOpacity
                style={[styles.button, styles.loginButton, (loading || token.length < 6) && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading || token.length < 6}>
                {loading ? (
                  <ActivityIndicator color={cores.light} />
                ) : (
                  <Text style={styles.buttonText}>Confirmar e Entrar</Text>
                )}
              </TouchableOpacity>

              {/* Botão de Reenviar com Cooldown */}
              <TouchableOpacity 
                style={styles.forgotPasswordButton} 
                onPress={() => handleSendCode(true)} // Passa 'true' no reenvio
                disabled={isResendDisabled || loading} 
              >
                <Text style={[
                  styles.forgotPasswordText, 
                  (isResendDisabled || loading) && styles.disabledText // Estilo de desabilitado
                ]}>
                  {isResendDisabled 
                    ? `Reenviar código em (${countdown}s)` 
                    : 'Reenviar código'
                  }
                </Text>
              </TouchableOpacity>
              
              {/* Botão de Voltar para trocar email */}
              <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => { setStep('email'); setErrorMessage(''); }} disabled={loading}>
                <Text style={styles.forgotPasswordText}>Voltar e trocar e-mail</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos (Completos, com o 'disabledText' que adicionamos)
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
  inputErrorBorder: {
    borderColor: cores.red500,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: 16, color: cores.secondary },
  errorText: {
    color: cores.red500,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row',
  },
  loginButton: {
    backgroundColor: cores.primary,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: cores.gray500,
    fontSize: 14,
  },
  // Estilo para o texto desabilitado do 'Reenviar'
  disabledText: {
    color: cores.gray300,
  },
});