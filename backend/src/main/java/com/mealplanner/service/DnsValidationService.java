package com.mealplanner.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;
import java.util.Set;

@Service
@Slf4j
public class DnsValidationService {

    // Fast path for trusted top-tier mail providers to bypass DNS latency
    private static final Set<String> WELL_KNOWN_DOMAINS = Set.of(
            "gmail.com", "googlemail.com", "yahoo.com", "ymail.com",
            "outlook.com", "hotmail.com", "live.com", "msn.com",
            "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
            "aol.com", "zoho.com", "mail.com", "gmx.com"
    );

    /**
     * Checks if the email domain possesses valid DNS MX (or A) records.
     *
     * @param email The target email address
     * @return true if domain has active mail-handling DNS records
     */
    public boolean hasValidMailDomain(String email) {
        if (email == null || !email.contains("@")) {
            return false;
        }

        String domain = email.substring(email.lastIndexOf("@") + 1).trim().toLowerCase();
        if (domain.isEmpty() || !domain.contains(".")) {
            return false;
        }

        if (WELL_KNOWN_DOMAINS.contains(domain)) {
            return true;
        }

        // Test/local development domains
        if (domain.endsWith(".test") || domain.endsWith(".localhost") || domain.equals("localhost")) {
            return true;
        }

        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "2000");
            env.put("com.sun.jndi.dns.timeout.retries", "1");

            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes(domain, new String[]{"MX"});
            Attribute attr = attrs.get("MX");

            if (attr != null && attr.size() > 0) {
                return true;
            }

            // Fallback according to RFC 5321: If no MX record exists, an A record can receive mail
            attrs = ctx.getAttributes(domain, new String[]{"A"});
            attr = attrs.get("A");
            return attr != null && attr.size() > 0;
        } catch (NamingException e) {
            log.warn("DNS MX/A record verification failed for domain '{}': {}", domain, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error during DNS validation for domain '{}'", domain, e);
            // Default to true on unexpected system error so legitimate users aren't blocked by transient network issues
            return true;
        }
    }
}
