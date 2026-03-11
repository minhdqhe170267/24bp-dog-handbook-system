package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogProfileResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.service.DogProfileService;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DogProfileServiceImpl implements DogProfileService {

    private final DogProfileRepository dogProfileRepository;
    private final DogBreedRepository dogBreedRepository;

    @Override
    public PageResponse<DogProfileResponse> getAll(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DogProfile> dogPage;

        if (search != null && !search.isBlank()) {
            dogPage = dogProfileRepository.findByDogNameContainingIgnoreCaseAndIsDeletedFalse(search, pageable);
        } else {
            dogPage = dogProfileRepository.findByIsDeletedFalse(pageable);
        }

        List<DogProfileResponse> content = dogPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PageResponse.<DogProfileResponse>builder()
                .content(content)
                .page(dogPage.getNumber())
                .size(dogPage.getSize())
                .totalElements(dogPage.getTotalElements())
                .totalPages(dogPage.getTotalPages())
                .build();
    }

    @Override
    public DogProfileResponse getById(Integer id) {
        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + id));
        return toResponse(dog);
    }

    @Override
    @Transactional
    public DogProfileResponse create(DogProfileRequest request) {
        DogBreed breed = dogBreedRepository.findByBreedIdAndIsDeletedFalse(request.getBreedId())
                .orElseThrow(() -> new ResourceNotFoundException("Breed not found with id: " + request.getBreedId()));

        DogProfile dog = DogProfile.builder()
                .dogCode("TEMP")
                .dogName(request.getDogName())
                .dogBreed(breed)
                .birthDate(request.getDateOfBirth())
                .gender(request.getGender() != null ? DogGender.valueOf(request.getGender()) : DogGender.MALE)
                .currentWeightKg(request.getCurrentWeightKg())
                .heightCm(request.getHeightCm())
                .color(request.getColor())
                .microchipId(request.getMicrochipId())
                .status(DogStatus.ACTIVE)
                .imageUrl(request.getImageUrl())
                .notes(request.getNotes())
                .build();

        dog = dogProfileRepository.save(dog);

        dog.setDogCode("DK" + String.format("%03d", dog.getDogId()));
        dog = dogProfileRepository.save(dog);

        return toResponse(dog);
    }

    @Override
    @Transactional
    public DogProfileResponse update(Integer id, DogProfileRequest request) {
        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + id));

        if (request.getBreedId() != null) {
            DogBreed breed = dogBreedRepository.findByBreedIdAndIsDeletedFalse(request.getBreedId())
                    .orElseThrow(() -> new ResourceNotFoundException("Breed not found with id: " + request.getBreedId()));
            dog.setDogBreed(breed);
        }

        if (request.getDogName() != null) dog.setDogName(request.getDogName());
        if (request.getDateOfBirth() != null) dog.setBirthDate(request.getDateOfBirth());
        if (request.getGender() != null) dog.setGender(DogGender.valueOf(request.getGender()));
        if (request.getCurrentWeightKg() != null) dog.setCurrentWeightKg(request.getCurrentWeightKg());
        if (request.getHeightCm() != null) dog.setHeightCm(request.getHeightCm());
        if (request.getColor() != null) dog.setColor(request.getColor());
        if (request.getMicrochipId() != null) dog.setMicrochipId(request.getMicrochipId());
        if (request.getStatus() != null) dog.setStatus(DogStatus.valueOf(request.getStatus()));
        if (request.getImageUrl() != null) dog.setImageUrl(request.getImageUrl());
        if (request.getNotes() != null) dog.setNotes(request.getNotes());

        return toResponse(dogProfileRepository.save(dog));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dog not found with id: " + id));
        dog.setIsDeleted(true);
        dog.setDeletedAt(LocalDateTime.now());
        dogProfileRepository.save(dog);
    }

    private DogProfileResponse toResponse(DogProfile entity) {
        Integer ageMonths = null;
        if (entity.getBirthDate() != null) {
            ageMonths = (int) ChronoUnit.MONTHS.between(
                    entity.getBirthDate().atStartOfDay(), LocalDateTime.now());
        }

        return DogProfileResponse.builder()
                .dogId(entity.getDogId())
                .dogCode(entity.getDogCode())
                .dogName(entity.getDogName())
                .breedId(entity.getDogBreed() != null ? entity.getDogBreed().getBreedId() : null)
                .breedName(entity.getDogBreed() != null ? entity.getDogBreed().getBreedName() : null)
                .gender(entity.getGender() != null ? entity.getGender().name() : null)
                .dateOfBirth(entity.getBirthDate())
                .ageMonths(ageMonths)
                .currentWeightKg(entity.getCurrentWeightKg())
                .heightCm(entity.getHeightCm())
                .color(entity.getColor())
                .microchipId(entity.getMicrochipId())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .imageUrl(entity.getImageUrl())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
