package com.ddimitko.beautyhub.config

import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.core.instrument.config.MeterFilter

import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment

/**
 * Configuration for Prometheus metrics
 */
@Configuration
class PrometheusMetricsConfig {

    /**
     * Customize the meter registry with common tags and filters
     */
    @Bean
    MeterRegistryCustomizer<MeterRegistry> metricsCommonTags(Environment environment) {
        return { registry ->
            registry.config()
                    .commonTags(
                            "application", "lunara",
                            "environment", environment.getActiveProfiles().length > 0 ? 
                                environment.getActiveProfiles()[0] : "default",
                            "version", getClass().getPackage().getImplementationVersion() ?: "unknown"
                    )
                    .meterFilter(MeterFilter.deny { id ->
                        // Filter out some noisy metrics
                        String name = id.getName()
                        return name.startsWith("jvm.gc.pause") && name.contains("unknown") ||
                               name.startsWith("hikaricp") && name.contains("pool.pending") ||
                               name.startsWith("system.cpu.count") ||
                               name.startsWith("process.files")
                    })

        }
    }


}
