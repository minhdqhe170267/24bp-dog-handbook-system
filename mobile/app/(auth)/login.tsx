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
import { useNetworkStore } from '../../src/stores/networkStore';
import { validateTextField } from '../../src/utils/formValidation';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error, clearError } = useAuthStore();
    const { colors } = useThemeStore();
    const isConnected = useNetworkStore((s) => s.isConnected);
    const isInternetReachable = useNetworkStore((s) => s.isInternetReachable);
    const isOnline = isConnected && isInternetReachable !== false;
    const usernameError = validateTextField(username, {
        label: 'Tên đăng nhập',
        required: true,
        minLength: 3,
        maxLength: 50,
    });
    const passwordError = validateTextField(password, {
        label: 'Mật khẩu',
        required: true,
        minLength: 6,
        maxLength: 100,
    });
    const canSubmit = !usernameError && !passwordError && !isLoading;

    useEffect(() => {
        clearError();
    }, [clearError]);

    const handleLogin = async (nextUsername = username, nextPassword = password) => {
        const nextUsernameError = validateTextField(nextUsername, {
            label: 'Tên đăng nhập',
            required: true,
            minLength: 3,
            maxLength: 50,
        });
        const nextPasswordError = validateTextField(nextPassword, {
            label: 'Mật khẩu',
            required: true,
            minLength: 6,
            maxLength: 100,
        });

        if (nextUsernameError || nextPasswordError) {
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
                            Hệ thống Sổ tay Chó nghiệp vụ
                        </Text>
                    </View>

                    {!isOnline && (
                        <View style={[styles.offlineBanner, { backgroundColor: colors.warning ?? '#FFF3CD' }]}>
                            <Ionicons name="cloud-offline-outline" size={18} color="#856404" />
                            <Text style={styles.offlineBannerText}>
                                Đang ở chế độ ngoại tuyến. Chỉ đăng nhập được với tài khoản đã lưu.
                            </Text>
                        </View>
                    )}

                    <Card style={styles.formCard}>
                        <Input
                            label="Tên đăng nhập"
                            placeholder="Nhập tên đăng nhập"
                            value={username}
                            onChangeText={setUsername}
                            leftIcon="person-outline"
                            error={usernameError ?? undefined}
                        />
                        <View style={{ height: spacing.md }} />
                        <Input
                            label="Mật khẩu"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChangeText={setPassword}
                            leftIcon="lock-closed-outline"
                            secureTextEntry
                            error={passwordError ?? undefined}
                        />
                        {error ? (
                            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        ) : null}
                        <View style={{ height: spacing.lg }} />
                        <Button
                            title={isOnline ? 'ĐĂNG NHẬP' : 'ĐĂNG NHẬP NGOẠI TUYẾN'}
                            variant="primary"
                            onPress={() => handleLogin()}
                            loading={isLoading}
                            disabled={!canSubmit}
                        />
                    </Card>


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
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: spacing.md,
    },
    offlineBannerText: {
        flex: 1,
        fontSize: fontSize.sm,
        color: '#856404',
    },
});
