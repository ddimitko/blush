package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class CustomerPortalResponse {
    String url
    String sessionId
    Date createdAt = new Date()
}
