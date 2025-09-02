package com.ddimitko.beautyhub.enums

enum BusinessType {
    HAIRDRESSER("Hairdresser"),
    BARBER("Barber"),
    MASSAGE("Massage"),
    NAIL_STYLIST("Nail Stylist"),
    SPA("SPA"),
    BEAUTY_SALON("Beauty Salon"),
    SKINCARE_CLINIC("Skincare Clinic"),
    EYEBROW_THREADING("Eyebrow Threading"),
    TATTOO_PARLOR("Tattoo Parlor"),
    WELLNESS_CENTER("Wellness Center"),
    MAKEUP_ARTIST("Makeup Artist"),
    LASH_EXTENSIONS("Lash Extensions"),
    MICROBLADING("Microblading"),
    PERMANENT_MAKEUP("Permanent Makeup"),
    WAXING_SALON("Waxing Salon")

    private final String displayName

    BusinessType(String displayName) {
        this.displayName = displayName
    }

    String getDisplayName() {
        return displayName
    }

    @Override
    String toString() {
        return displayName
    }
}
