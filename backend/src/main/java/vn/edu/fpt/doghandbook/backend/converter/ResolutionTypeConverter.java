package vn.edu.fpt.doghandbook.backend.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import vn.edu.fpt.doghandbook.backend.entity.enums.ResolutionType;

@Slf4j
@Converter
public class ResolutionTypeConverter implements AttributeConverter<ResolutionType, String> {

    @Override
    public String convertToDatabaseColumn(ResolutionType attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public ResolutionType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return ResolutionType.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            log.warn("[ResolutionTypeConverter] Unknown resolution_type '{}' in DB, treating as null", dbData);
            return null;
        }
    }
}
