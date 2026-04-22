package com.daiphat.accountservice.application.dto.response.base;

/**
 * Jackson JSON Views to control field visibility.
 */
public class Views {
    public static class Public {}
    public static class Me extends Public {}
    public static class Admin extends Public {}
}
