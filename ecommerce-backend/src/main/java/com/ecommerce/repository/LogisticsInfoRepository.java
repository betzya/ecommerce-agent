package com.ecommerce.repository;

import com.ecommerce.entity.LogisticsInfo;
import com.ecommerce.entity.OrderEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogisticsInfoRepository extends JpaRepository<LogisticsInfo, Long> {

    Optional<LogisticsInfo> findByOrderEntity(OrderEntity orderEntity);
}
