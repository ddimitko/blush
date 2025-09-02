package com.ddimitko.beautyhub.security

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.repository.UserRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository

    @Override
    UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndEnabledTrue(email)
                .orElseThrow { new UsernameNotFoundException("User not found with email: $email") }

        return CustomUserPrincipal.create(user)
    }

    UserDetails loadUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow { new UsernameNotFoundException("User not found with id: $id") }

        return CustomUserPrincipal.create(user)
    }
}
