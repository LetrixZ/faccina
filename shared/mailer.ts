import nodemailer, { type Transporter } from 'nodemailer';

import config from './config';

let _transporter: Transporter | undefined = undefined;

export const transporter = () => {
	if (!_transporter) {
		if (!config.mailer) {
			throw new Error('No mailer configuration detected.');
		}

		const { host, port, secure, user, pass } = config.mailer;

		_transporter = nodemailer.createTransport({
			host,
			port,
			secure,
			auth: {
				user,
				pass,
			},
		});
	}

	return _transporter;
};
