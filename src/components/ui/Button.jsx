function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  isLoading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`ui-button ui-button-${variant} ${className}`.trim()}
      type={type}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}

export default Button;
