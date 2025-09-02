package com.ddimitko.beautyhub.config

import groovy.util.logging.Slf4j
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor

import java.util.concurrent.Executor
import java.util.concurrent.RejectedExecutionHandler
import java.util.concurrent.ThreadPoolExecutor

@Configuration
@EnableAsync
@Slf4j
class AsyncConfig {

    @Bean(name = "emailTaskExecutor")
    Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor()
        
        // Core pool size - number of threads to keep alive
        executor.setCorePoolSize(2)
        
        // Maximum pool size - maximum number of threads
        executor.setMaxPoolSize(5)
        
        // Queue capacity - number of tasks to queue before creating new threads
        executor.setQueueCapacity(100)
        
        // Thread name prefix for easier debugging
        executor.setThreadNamePrefix("Email-")
        
        // Keep alive time for idle threads
        executor.setKeepAliveSeconds(60)
        
        // Allow core threads to timeout
        executor.setAllowCoreThreadTimeOut(true)
        
        // Rejection policy when queue is full
        executor.setRejectedExecutionHandler(new RejectedExecutionHandler() {
            @Override
            void rejectedExecution(Runnable r, ThreadPoolExecutor threadPoolExecutor) {
                log.warn("Email task rejected due to full queue and max pool size reached. Task: ${r.class.simpleName}")
                // You could implement a fallback strategy here, such as:
                // - Logging the email for manual processing
                // - Storing in database for retry later
                // - Sending to a dead letter queue
            }
        })
        
        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true)
        executor.setAwaitTerminationSeconds(30)
        
        executor.initialize()
        return executor
    }

    @Bean(name = "scheduledTaskExecutor")
    Executor scheduledTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor()
        
        // Smaller pool for scheduled tasks
        executor.setCorePoolSize(1)
        executor.setMaxPoolSize(3)
        executor.setQueueCapacity(50)
        executor.setThreadNamePrefix("Scheduled-")
        executor.setKeepAliveSeconds(60)
        executor.setAllowCoreThreadTimeOut(true)
        
        executor.setRejectedExecutionHandler(new RejectedExecutionHandler() {
            @Override
            void rejectedExecution(Runnable r, ThreadPoolExecutor threadPoolExecutor) {
                log.warn("Scheduled task rejected: ${r.class.simpleName}")
            }
        })
        
        executor.setWaitForTasksToCompleteOnShutdown(true)
        executor.setAwaitTerminationSeconds(30)
        
        executor.initialize()
        return executor
    }

    @Bean(name = "generalTaskExecutor")
    Executor generalTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor()
        
        // General purpose async executor
        executor.setCorePoolSize(3)
        executor.setMaxPoolSize(10)
        executor.setQueueCapacity(200)
        executor.setThreadNamePrefix("Async-")
        executor.setKeepAliveSeconds(60)
        executor.setAllowCoreThreadTimeOut(true)
        
        executor.setRejectedExecutionHandler(new RejectedExecutionHandler() {
            @Override
            void rejectedExecution(Runnable r, ThreadPoolExecutor threadPoolExecutor) {
                log.warn("General async task rejected: ${r.class.simpleName}")
            }
        })
        
        executor.setWaitForTasksToCompleteOnShutdown(true)
        executor.setAwaitTerminationSeconds(30)
        
        executor.initialize()
        return executor
    }
}
