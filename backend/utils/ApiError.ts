import type { ZodError } from "zod";

export type FieldError = {
    field: string;
    message: string;
};

type ApiErrorOptions = {
    status: number;
    title: string;
    detail: string;
    type?: string;
    errors?: FieldError[];
};

export class ApiError extends Error {
    readonly status: number;
    readonly title: string;
    readonly detail: string;
    readonly type: string;
    readonly errors?: FieldError[];

    constructor({ status, title, detail, type = "about:blank", errors }: ApiErrorOptions) {
        super(detail);
        this.name = "ApiError";
        this.status = status;
        this.title = title;
        this.detail = detail;
        this.type = type;
        this.errors = errors;
    }

    static badRequest(detail: string) {
        return new ApiError({
            status: 400,
            title: "Nieprawidłowe żądanie.",
            detail,
            type: "/problems/bad-request"
        });
    }

    static notFound(detail: string) {
        return new ApiError({
            status: 404,
            title: "Nie znaleziono zasobu.",
            detail,
            type: "/problems/not-found"
        });
    }

    static conflict(detail: string, type = "/problems/conflict") {
        return new ApiError({
            status: 409,
            title: "Konflikt ze stanem zasobu.",
            detail,
            type
        });
    }

    static unprocessable(detail: string, errors?: FieldError[]) {
        return new ApiError({
            status: 422,
            title: "Błędne dane wejściowe.",
            detail,
            type: "/problems/validation-error",
            errors
        });
    }

    static fromZod(error: ZodError, detail: string) {
        return ApiError.unprocessable(
            detail,
            error.issues.map((issue) => ({
                field: issue.path.map(String).join("."),
                message: issue.message
            }))
        );
    }

    static internal(detail = "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.") {
        return new ApiError({
            status: 500,
            title: "Wewnętrzny błąd serwera.",
            detail,
            type: "/problems/internal"
        });
    }
}
