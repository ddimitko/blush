package com.ddimitko.beautyhub.enums

enum ServiceCategory {
    HAIR("Hair"),
    NAILS("Nails"),
    SKINCARE("Skincare"),
    MASSAGE("Massage"),
    MAKEUP("Makeup"),
    EYEBROWS("Eyebrows"),
    LASHES("Lashes"),
    WAXING("Waxing"),
    TATTOO("Tattoo"),
    PIERCING("Piercing"),
    WELLNESS("Wellness"),
    OTHER("Other")

    private final String displayName

    ServiceCategory(String displayName) {
        this.displayName = displayName
    }

    String getDisplayName() {
        return displayName
    }

    @Override
    String toString() {
        return displayName
    }

    static List<Map<String, String>> getAllCategories() {
        return values().collect { category ->
            [
                value: category.name(),
                label: category.displayName
            ]
        }
    }
}
