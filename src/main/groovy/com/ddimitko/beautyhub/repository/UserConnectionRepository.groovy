package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.UserConnection
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserConnectionRepository extends JpaRepository<UserConnection, UUID> {
    
    Optional<UserConnection> findByProviderAndProviderId(String provider, String providerId)
    
    List<UserConnection> findByUserId(UUID userId)
    
    Optional<UserConnection> findByUserIdAndProvider(UUID userId, String provider)
    
    void deleteByUserIdAndProvider(UUID userId, String provider)
    
    boolean existsByProviderAndProviderId(String provider, String providerId)
}
