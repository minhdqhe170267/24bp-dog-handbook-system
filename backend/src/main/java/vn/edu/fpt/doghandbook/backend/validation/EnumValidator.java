package vn.edu.fpt.doghandbook.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public class EnumValidator implements ConstraintValidator<ValidEnum, String> {

    private Set<String> acceptedValues;
    private String enumName;

    @Override
    public void initialize(ValidEnum annotation) {
        enumName = annotation.enumClass().getSimpleName();
        acceptedValues = Arrays.stream(annotation.enumClass().getEnumConstants())
                .map(Enum::name)
                .collect(Collectors.toSet());
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        boolean valid = acceptedValues.contains(value.toUpperCase());
        if (!valid) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                    "Giá trị '" + value + "' không hợp lệ. Chấp nhận: " + acceptedValues
            ).addConstraintViolation();
        }
        return valid;
    }
}
