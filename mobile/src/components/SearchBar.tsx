import React, { forwardRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

export interface SearchBarProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'placeholder'> {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    loading?: boolean;
    disabled?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    onClear?: () => void;
    onSubmit?: (text: string) => void;
    clearAccessibilityLabel?: string;
}

export const SearchBar = forwardRef<TextInput, SearchBarProps>(
    (
        {
            value,
            onChangeText,
            placeholder = 'Tìm kiếm...',
            loading = false,
            disabled = false,
            icon = 'search',
            containerStyle,
            inputStyle,
            onClear,
            onSubmit,
            clearAccessibilityLabel = 'Xóa từ khóa tìm kiếm',
            editable = true,
            returnKeyType = 'search',
            autoCapitalize = 'none',
            autoCorrect = false,
            blurOnSubmit = false,
            onFocus,
            onBlur,
            onSubmitEditing,
            ...textInputProps
        },
        ref,
    ) => {
        const { colors } = useThemeStore();
        const [focused, setFocused] = useState(false);
        const isEditable = editable && !disabled;
        const showClearButton = isEditable && !loading && value.length > 0;

        const handleClear = () => {
            onChangeText('');
            onClear?.();
        };

        return (
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.surface,
                        borderColor: focused ? colors.primary : colors.border,
                        opacity: disabled ? 0.6 : 1,
                    },
                    containerStyle,
                ]}
            >
                <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textLight} />
                <TextInput
                    ref={ref}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textLight}
                    editable={isEditable}
                    returnKeyType={returnKeyType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    blurOnSubmit={blurOnSubmit}
                    onFocus={(event) => {
                        setFocused(true);
                        onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        setFocused(false);
                        onBlur?.(event);
                    }}
                    onSubmitEditing={(event) => {
                        onSubmit?.(event.nativeEvent.text || value);
                        onSubmitEditing?.(event);
                    }}
                    style={[styles.input, { color: colors.text }, inputStyle]}
                    {...textInputProps}
                />
                <View style={styles.trailingSlot}>
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : null}
                    {showClearButton ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={clearAccessibilityLabel}
                            activeOpacity={0.7}
                            onPress={handleClear}
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={20} color={colors.textLight} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        );
    },
);

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 48,
    },
    input: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
        paddingVertical: spacing.xs,
        minWidth: 0,
    },
    trailingSlot: {
        width: 28,
        height: 28,
        marginLeft: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearButton: {
        padding: spacing.xs,
    },
});
