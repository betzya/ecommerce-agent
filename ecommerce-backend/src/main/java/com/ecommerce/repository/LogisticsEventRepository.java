package com.ecommerce.repository;

import com.ecommerce.entity.LogisticsEvent;
import com.ecommerce.entity.LogisticsInfo;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogisticsEventRepository extends JpaRepository<LogisticsEvent, Long> {

    List<LogisticsEvent> findByLogisticsInfoOrderByOccurredAtDesc(LogisticsInfo logisticsInfo);
}
