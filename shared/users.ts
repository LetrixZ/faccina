import { randomBytes } from 'node:crypto';
import chalk from 'chalk';
import config from './config';
import db from './db';
import { now } from './db/helpers';
import { transporter } from './mailer';

/**
 * Generates a new recovery code for the user,
 * and invalidates all the previous ones.
 * @param id User ID
 * @returns recovery code
 */
export const recoveryCode = async (id: string) => {
	const code = randomBytes(16).toString('hex');

	await db
		.updateTable('userCodes')
		.set({ consumedAt: now() })
		.where('userId', '=', id)
		.where('consumedAt', 'is', null)
		.where('type', '=', 'recovery')
		.execute();

	await db
		.insertInto('userCodes')
		.values({
			userId: id,
			code,
			type: 'recovery',
		})
		.execute();

	return code;
};

/**
 * Sends the generated recovery code to the specified email using Nodemailer.
 * @param email Email to send recover steps to
 * @param code Recovery code
 * @param username Username
 */
export const sendRecoveryEmail = async (email: string, code: string, username: string) => {
	if (!config.mailer) {
		throw new Error('Mailer credentials were not found in the configuration.');
	}

	console.info(
		`[${new Date().toISOString()}] Sending access recovery email to user ${chalk.bold(username)} with email ${chalk.bold(email)}`
	);

	const html = `
		<div style='background-color: #282828; padding: 1rem;'>
			<div style='background-color: #0a0a0a; font-family: Inter, sans-serif; padding: 1rem; border-radius: 6px; font-size: 0.825rem'>
				<div>
					<div>
						<div style="color: white;">
							<p>A request to recover access to this account was made. Ignore this email if it wasn't you.</p>
							<p>Recovery code: <b>${code}</b></p>
						</div>
						${
							config.site.url
								? (() => {
										const recoveryLink = `${config.site.url}/reset?code=${code}`;
										return `
										<div style='padding-top: 10px;'>
											<a style='background-color: #dc2828; border-radius: 8px; font-size: 0.825rem; font-weight: 500; height: 40px; color: white; padding: 0.5rem; text-decoration: none;' href="${recoveryLink}">
												Click to Reset Password
											</a>
											<p style="color: white; font-size: 0.625rem; padding-top: 4px">
												Copy this link if you can't click the button</br><a href="${recoveryLink}">${recoveryLink}</a>
											</p>
										</div>
										`;
									})()
								: ``
						}
					</div>
				</div>
			</div>
		</div>`;

	const response = await transporter().sendMail({
		from: config.mailer.from,
		to: email,
		subject: `${config.site.siteName} | Account Recovery`,
		html,
	});

	console.info(
		`[${new Date().toISOString()}] Recover access email - ${chalk.bold(username)} (${chalk.bold(email)}) - Response`,
		response
	);
};
