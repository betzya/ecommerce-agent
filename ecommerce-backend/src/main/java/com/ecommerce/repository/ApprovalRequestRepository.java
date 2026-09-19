package com.ecommerce.repository;

import com.ecommerce.entity.ApprovalRequest;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {

    Optional<ApprovalRequest> findByApprovalId(String approvalId);
}
