package com.ecommerce.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ecommerce.dto.AgentChatRequest;
import com.ecommerce.dto.AgentResumeRequest;

public interface CustomerServiceAgentClient {

    JsonNode chat(AgentChatRequest request);

    JsonNode resume(AgentResumeRequest request);
}
