package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SystemSetting;

import java.util.List;
import java.util.Optional;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, Integer> {

    Optional<SystemSetting> findBySettingKey(String settingKey);

    List<SystemSetting> findBySettingGroupOrderBySettingKeyAsc(String settingGroup);

    List<SystemSetting> findAllByOrderBySettingGroupAscSettingKeyAsc();

    boolean existsBySettingKey(String settingKey);
}
