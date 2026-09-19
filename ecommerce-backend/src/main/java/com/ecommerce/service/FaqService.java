package com.ecommerce.service;

import com.ecommerce.dto.FaqResponse;
import com.ecommerce.entity.FaqEntry;
import com.ecommerce.repository.FaqEntryRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class FaqService {

    private final FaqEntryRepository faqEntryRepository;

    public FaqService(FaqEntryRepository faqEntryRepository) {
        this.faqEntryRepository = faqEntryRepository;
    }

    public List<FaqResponse> listFaq(String keyword) {
        List<FaqEntry> entries;
        if (StringUtils.hasText(keyword)) {
            entries = faqEntryRepository.findByCategoryContainingIgnoreCaseOrQuestionContainingIgnoreCaseOrAnswerContainingIgnoreCase(
                keyword,
                keyword,
                keyword);
        } else {
            entries = faqEntryRepository.findAll();
        }
        return entries.stream()
            .map(entry -> new FaqResponse(entry.getCategory(), entry.getQuestion(), entry.getAnswer()))
            .collect(Collectors.toList());
    }
}
