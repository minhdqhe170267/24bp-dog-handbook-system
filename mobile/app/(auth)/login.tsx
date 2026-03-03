import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { spacing, fontSize } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error, clearError, devLogin } = useAuthStore();
    const { colors } = useThemeStore();

    useEffect(() => {
        clearError();
    }, []);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) return;
        const success = await login({
            username: username.trim(),
            password: password.trim(),
        });
        if (success) router.replace('/(tabs)');
    };

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.content}>
                    <View style={styles.logoArea}>
                        <Ionicons name="paw" size={72} color={colors.primary} />
                        <Text style={[styles.appName, { color: colors.primary }]}>DHS</Text>
                        <Text style={[styles.appTitle, { color: colors.textSecondary }]}>Dog Handbook System</Text>
                        <Text style={[styles.appSubtitle, { color: colors.textLight }]}>
                            Hệ thống Sổ tay Chó nghiệp vụ
                        </Text>
                    </View>

                    <Card style={styles.formCard}>
                        <Input
                            label="Tên đăng nhập"
                            placeholder="Nhập tên đăng nhập"
                            value={username}
                            onChangeText={setUsername}
                            leftIcon="person-outline"
                        />
                        <View style={{ height: spacing.md }} />
                        <Input
                            label="Mật khẩu"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChangeText={setPassword}
                            leftIcon="lock-closed-outline"
                            secureTextEntry
                        />
                        {error && (
                            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        )}
                        <View style={{ height: spacing.lg }} />
                        <Button
                            title="ĐĂNG NHẬP"
                            variant="primary"
                            onPress={handleLogin}
                            loading={isLoading}
                        />
                    </Card>

                    <Button
                        title="Bỏ qua đăng nhập (Dev)"
                        variant="outline"
                        onPress={() => {
                            devLogin();
                            router.replace('/(tabs)');
                        }}
                        style={{ marginTop: spacing.md }}
                    />

                    <Text style={[styles.version, { color: colors.textLight }]}>Phiên bản 1.0.0</Text>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
    logoArea: { alignItems: 'center', marginBottom: spacing.xl },
    appName: { fontSize: fontSize.title, fontWeight: 'bold', marginTop: spacing.sm },
    appTitle: { fontSize: fontSize.lg },
    appSubtitle: { fontSize: fontSize.sm, marginTop: spacing.xs },
    formCard: { padding: spacing.xl },
    errorText: { fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: 'center' },
    version: { fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.xl },
});
