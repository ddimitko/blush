package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.UserRole
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase

import static org.assertj.core.api.Assertions.assertThat

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles(["test"])
class UserRepositoryTest extends com.ddimitko.beautyhub.AbstractPostgresTest {

    @Autowired
    UserRepository userRepository

    @Test
    void "can persist and find user by email ignoring case policy at service level"() {
        def user = new User(
                email: "testuser@example.com",
                password: "P@ssw0rd123",
                firstName: "Test",
                lastName: "User",
                role: UserRole.USER,
                enabled: true,
                emailVerified: true
        )
        userRepository.save(user)

        def found = userRepository.findByEmail("testuser@example.com")
        assertThat(found).isPresent()
        assertThat(found.get().firstName).isEqualTo("Test")
    }
}

