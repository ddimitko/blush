package com.ddimitko.beautyhub.validation

import org.junit.jupiter.api.Test

import static org.assertj.core.api.Assertions.assertThat

class PasswordValidatorTest {

    private final PasswordValidator validator = new PasswordValidator()

    @Test
    void "null and blank passwords are invalid"() {
        assertThat(validator.isValid(null, null)).isFalse()
        assertThat(validator.isValid("", null)).isFalse()
        assertThat(validator.isValid("   ", null)).isFalse()
    }

    @Test
    void "password must be at least 8 chars"() {
        assertThat(validator.isValid("Abcdefg", null)).isFalse() // 7 chars
        assertThat(validator.isValid("Abcdefgh", null)).isTrue() // 8 chars
    }

    @Test
    void "password must contain both upper and lower case"() {
        assertThat(validator.isValid("abcdefgh", null)).isFalse()
        assertThat(validator.isValid("ABCDEFGH", null)).isFalse()
        assertThat(validator.isValid("Abcdefgh", null)).isTrue()
    }
}

