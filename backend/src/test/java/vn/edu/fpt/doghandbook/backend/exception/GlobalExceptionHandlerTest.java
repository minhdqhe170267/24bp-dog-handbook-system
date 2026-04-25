package vn.edu.fpt.doghandbook.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleResourceNotFound_returns404Response() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleResourceNotFound(
                new ResourceNotFoundException("Dog", "id", 1)
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().getErrorCode()).isEqualTo("NOT_FOUND");
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void handleBadRequest_returns400Response() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleBadRequest(
                new BadRequestException(ErrorCode.BAD_REQUEST, "invalid request")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getErrorCode()).isEqualTo("BAD_REQUEST");
        assertThat(response.getBody().getMessage()).isEqualTo("invalid request");
    }

    @Test
    void handleConflict_returns409Response() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleConflict(
                new ConflictException(ErrorCode.CONFLICT, "duplicate")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getErrorCode()).isEqualTo("CONFLICT");
        assertThat(response.getBody().getMessage()).isEqualTo("duplicate");
    }

    @Test
    void handleSyncConflict_returns409ResponseWithServerData() {
        ResponseEntity<ApiResponse<Object>> response = handler.handleSyncConflict(
                new SyncConflictException("sync conflict", Map.of("server", "value"))
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getErrorCode()).isEqualTo("SYNC_CONFLICT");
        assertThat(response.getBody().getData()).isEqualTo(Map.of("server", "value"));
    }

    @Test
    void handleValidation_returnsFieldErrors() {
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        List<FieldError> fieldErrors = List.of(
                new FieldError("request", "title", "title required"),
                new FieldError("request", "status", "status invalid")
        );

        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(fieldErrors);

        ResponseEntity<ApiResponse<Void>> response = handler.handleValidation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getErrorCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().getErrors()).hasSize(2);
        assertThat(response.getBody().getMessage()).contains("title required", "status invalid");
    }

    @Test
    void handleHandlerMethodValidation_mapsFieldAndParameterErrors() {
        HandlerMethodValidationException exception = mock(HandlerMethodValidationException.class);
        ParameterValidationResult fieldResult = mock(ParameterValidationResult.class);
        ParameterValidationResult parameterResult = mock(ParameterValidationResult.class);
        MethodParameter methodParameter = mock(MethodParameter.class);
        FieldError fieldError = new FieldError("request", "title", "title required");
        MessageSourceResolvable resolvable = mock(MessageSourceResolvable.class);

        when(exception.getParameterValidationResults()).thenReturn(List.of(fieldResult, parameterResult));
        when(fieldResult.getResolvableErrors()).thenReturn(List.of(fieldError));
        when(parameterResult.getResolvableErrors()).thenReturn(List.of(resolvable));
        when(parameterResult.getMethodParameter()).thenReturn(methodParameter);
        when(methodParameter.getParameterName()).thenReturn("status");
        when(resolvable.getDefaultMessage()).thenReturn("status invalid");

        ResponseEntity<ApiResponse<Void>> response = handler.handleHandlerMethodValidation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getErrorCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().getErrors()).hasSize(2);
        assertThat(response.getBody().getErrors().get(0).getField()).isEqualTo("title");
        assertThat(response.getBody().getErrors().get(1).getField()).isEqualTo("status");
        assertThat(response.getBody().getMessage()).contains("title required", "status invalid");
    }

    @Test
    void handleHandlerMethodValidation_withoutMessages_returnsDefaultSummary() {
        HandlerMethodValidationException exception = mock(HandlerMethodValidationException.class);
        ParameterValidationResult result = mock(ParameterValidationResult.class);
        MessageSourceResolvable resolvable = mock(MessageSourceResolvable.class);

        when(exception.getParameterValidationResults()).thenReturn(List.of(result));
        when(result.getResolvableErrors()).thenReturn(List.of(resolvable));
        when(resolvable.getDefaultMessage()).thenReturn(null);

        ResponseEntity<ApiResponse<Void>> response = handler.handleHandlerMethodValidation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getErrorCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().getErrors()).isEmpty();
        assertThat(response.getBody().getMessage()).isEqualTo(ErrorCode.VALIDATION_ERROR.getDefaultMessage());
    }

    @Test
    void handleMissingParameter_returns400Response() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleMissingParameter(
                new MissingServletRequestParameterException("page", "int")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getErrorCode()).isEqualTo("MISSING_PARAMETER");
        assertThat(response.getBody().getMessage()).contains("page");
    }

    @Test
    void handleNoResourceFound_returns404Response() {
        NoResourceFoundException exception = mock(NoResourceFoundException.class);
        when(exception.getResourcePath()).thenReturn("/missing");

        ResponseEntity<ApiResponse<Void>> response = handler.handleNoResourceFound(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().getErrorCode()).isEqualTo("ENDPOINT_NOT_FOUND");
        assertThat(response.getBody().getMessage()).contains("/missing");
    }

    @Test
    void handleAccessDenied_returns403Response() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleAccessDenied(
                new AccessDeniedException("forbidden")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().getErrorCode()).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void handleGeneral_returns500Response() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleGeneral(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().getErrorCode()).isEqualTo("INTERNAL_ERROR");
    }
}
