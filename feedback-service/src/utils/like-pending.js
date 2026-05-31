const pendingValidations = new Map();

const DEFAULT_TIMEOUT_MS = 10000;

function waitForValidation(correlationId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingValidations.delete(correlationId);
      reject({ reason: "VALIDATION_TIMEOUT", message: "Validation timed out" });
    }, timeoutMs);

    pendingValidations.set(correlationId, {
      resolve: (data) => {
        clearTimeout(timer);
        pendingValidations.delete(correlationId);
        resolve(data);
      },
      reject: (error) => {
        clearTimeout(timer);
        pendingValidations.delete(correlationId);
        reject(error);
      },
    });
  });
}

function resolveValidation(correlationId, data) {
  const pending = pendingValidations.get(correlationId);
  if (pending) {
    pending.resolve(data);
  }
}

function rejectValidation(correlationId, error) {
  const pending = pendingValidations.get(correlationId);
  if (pending) {
    pending.reject(error);
  }
}

module.exports = {
  waitForValidation,
  resolveValidation,
  rejectValidation,
};
