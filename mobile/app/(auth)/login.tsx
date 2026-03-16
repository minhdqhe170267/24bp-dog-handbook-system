import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
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
    const { login, isLoading, error, clearError } = useAuthStore();
    const { colors } = useThemeStore();

    useEffect(() => {
        clearError();
    }, [clearError]);

    const handleLogin = async (nextUsername = username, nextPassword = password) => {
        if (!nextUsername.trim() || !nextPassword.trim()) {
            return;
        }

        const success = await login({
            username: nextUsername.trim(),
            password: nextPassword.trim(),
        });

        if (success) {
            router.replace('/(tabs)');
        }
    };

    const handleQuickLogin = async () => {
        setUsername('trainer01');
        setPassword('trainer123');
        await handleLogin('trainer01', 'trainer123');
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
                            He thong So tay Cho nghiep vu
                        </Text>
                    </View>

                    <Card style={styles.formCard}>
                        <Input
                            label="Ten dang nhap"
                            placeholder="Nhap ten dang nhap"
                            value={username}
                            onChangeText={setUsername}
                            leftIcon="person-outline"
                        />
                        <View style={{ height: spacing.md }} />
                        <Input
                            label="Mat khau"
                            placeholder="Nhap mat khau"
                            value={password}
                            onChangeText={setPassword}
                            leftIcon="lock-closed-outline"
                            secureTextEntry
                        />
                        {error ? (
                            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        ) : null}
                        <View style={{ height: spacing.lg }} />
                        <Button
                            title="DANG NHAP"
                            variant="primary"
                            onPress={() => handleLogin()}
                            loading={isLoading}
                        />
                    </Card>

                    <Button
                        title="Dang nhap nhanh trainer01"
                        variant="outline"
                        onPress={handleQuickLogin}
                        style={{ marginTop: spacing.md }}
                    />

                    <Text style={[styles.version, { color: colors.textLight }]}>Phien ban 1.0.0</Text>
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
